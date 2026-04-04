import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Point workerSrc to our own bundled worker to prevent version mismatch with n8n's pdfjs-dist
const pdfjsWorkerPath: string = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `file://${pdfjsWorkerPath}`;
import { PDFDocument } from 'pdf-lib';

export class PdfUtils implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Utils',
		name: 'pdfUtils',
		icon: 'file:pdf.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Inspect, split, and decrypt PDF files',
		defaults: {
			name: 'PDF Utils',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Inspect',
						value: 'inspect',
						description: 'Analyze PDF structure, detect if it is vectorial, and check if it is encrypted',
						action: 'Inspect PDF file',
					},
					{
						name: 'Inspect and Split',
						value: 'inspectAndSplit',
						description: 'Inspect PDF and split only if not vectorial',
						action: 'Inspect and conditionally split PDF',
					},
					{
						name: 'Decrypt',
						value: 'decrypt',
						description: 'Remove password protection from an encrypted PDF',
						action: 'Decrypt PDF file',
					},
					{
						name: 'Split',
						value: 'split',
						description: 'Split multi-page PDF into individual pages',
						action: 'Split PDF into pages',
					},
				],
				default: 'inspect',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the PDF file',
			},
			{
				displayName: 'Text Threshold',
				name: 'textThreshold',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['inspect', 'inspectAndSplit'],
					},
				},
				default: 50,
				description: 'Minimum text length to consider PDF as vectorial (text-based)',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						operation: ['decrypt'],
					},
				},
				default: '',
				required: true,
				description: 'Password to decrypt the PDF (user or owner password)',
			},
			{
				displayName: 'Output Binary Property',
				name: 'outputBinaryProperty',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['split', 'inspectAndSplit', 'decrypt'],
					},
				},
				default: 'data',
				description: 'Name for the output binary property of the resulting PDF',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', itemIndex) as string;
				const binaryData = this.helpers.assertBinaryData(itemIndex, binaryPropertyName);

				// Get PDF buffer
				const pdfBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

				if (operation === 'inspect') {
					const result = await PdfUtils.prototype.inspectPdf.call(this, pdfBuffer, itemIndex);
					returnData.push({
						json: {
							...items[itemIndex].json,
							...result,
						},
						binary: items[itemIndex].binary,
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'inspectAndSplit') {
					const result = await PdfUtils.prototype.inspectPdf.call(this, pdfBuffer, itemIndex);

					if (result.isVectorial) {
						// Vectorial PDF: pass through with inspection results
						returnData.push({
							json: {
								...items[itemIndex].json,
								...result,
							},
							binary: items[itemIndex].binary,
							pairedItem: { item: itemIndex },
						});
					} else {
						// Non-vectorial PDF: split into pages
						const outputBinaryProperty = this.getNodeParameter(
							'outputBinaryProperty',
							itemIndex,
						) as string;
						const splitResults = await PdfUtils.prototype.splitPdf.call(
							this,
							pdfBuffer,
							binaryData.fileName || 'document.pdf',
							outputBinaryProperty,
						);

						splitResults.forEach((splitItem: INodeExecutionData, pageIndex: number) => {
							returnData.push({
								json: {
									...items[itemIndex].json,
									...result,
									pageNumber: pageIndex + 1,
									originalFileName: binaryData.fileName || 'document.pdf',
								},
								binary: splitItem.binary,
								pairedItem: { item: itemIndex },
							});
						});
					}
				} else if (operation === 'decrypt') {
					const password = this.getNodeParameter('password', itemIndex) as string;
					const outputBinaryProperty = this.getNodeParameter(
						'outputBinaryProperty',
						itemIndex,
					) as string;
					const decryptedBuffer = await PdfUtils.prototype.decryptPdf.call(
						this,
						pdfBuffer,
						password,
						itemIndex,
					);
					const originalFileName = binaryData.fileName || 'document.pdf';
					const baseFileName = originalFileName.replace(/\.pdf$/i, '');
					const outputBinaryData = await this.helpers.prepareBinaryData(
						decryptedBuffer,
						`${baseFileName}_decrypted.pdf`,
						'application/pdf',
					);
					returnData.push({
						json: {
							...items[itemIndex].json,
							decrypted: true,
							originalFileName,
						},
						binary: {
							[outputBinaryProperty]: outputBinaryData,
						},
						pairedItem: { item: itemIndex },
					});
				} else if (operation === 'split') {
					const outputBinaryProperty = this.getNodeParameter(
						'outputBinaryProperty',
						itemIndex,
					) as string;
					const splitResults = await PdfUtils.prototype.splitPdf.call(
						this,
						pdfBuffer,
						binaryData.fileName || 'document.pdf',
						outputBinaryProperty,
					);

					// Add each page as a separate item, preserving upstream JSON
					splitResults.forEach((splitItem: INodeExecutionData, pageIndex: number) => {
						returnData.push({
							json: {
								...items[itemIndex].json,
								pageNumber: pageIndex + 1,
								originalFileName: binaryData.fileName || 'document.pdf',
							},
							binary: splitItem.binary,
							pairedItem: { item: itemIndex },
						});
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	private async inspectPdf(
		this: IExecuteFunctions,
		pdfBuffer: Buffer,
		itemIndex: number,
	): Promise<any> {
		const textThreshold = this.getNodeParameter('textThreshold', itemIndex) as number;

		try {
			// Load PDF with pdfjs-dist in headless mode (no canvas/worker required)
			const loadingTask = pdfjsLib.getDocument({
				data: new Uint8Array(pdfBuffer),
				verbosity: 0,
				worker: null as any, // Disable worker in Node.js - types don't allow null but runtime requires it
				useWorkerFetch: false,
				isEvalSupported: false,
				useSystemFonts: true,
			});

			const pdfDocument = await loadingTask.promise;
			const pageCount = pdfDocument.numPages;

			// Get first page to analyze text
			const firstPage = await pdfDocument.getPage(1);
			const textContent = await firstPage.getTextContent();

			// Extract all text from first page
			const text = textContent.items.map((item: any) => ('str' in item ? item.str : '')).join('');

			const textLength = text.length;
			const isVectorial = textLength > textThreshold;
			const isMultiPage = pageCount > 1;

			// Clean up
			await pdfDocument.destroy();

			return {
				isEncrypted: false,
				pageCount,
				isMultiPage,
				isVectorial,
				textLength,
				firstPageText: text.substring(0, 200), // Preview of first 200 chars
			};
		} catch (error) {
			// pdfjs-dist throws a PasswordException when the PDF is encrypted
			const msg = (error as Error).message ?? '';
			if (msg.toLowerCase().includes('password') || (error as any).name === 'PasswordException') {
				return { isEncrypted: true };
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to inspect PDF: ${msg}`,
				{ itemIndex },
			);
		}
	}

	private async decryptPdf(
		this: IExecuteFunctions,
		pdfBuffer: Buffer,
		password: string,
		itemIndex: number,
	): Promise<Buffer> {
		const id = randomUUID();
		const inputPath = join(tmpdir(), `pdf-decrypt-in-${id}.pdf`);
		const outputPath = join(tmpdir(), `pdf-decrypt-out-${id}.pdf`);

		try {
			await writeFile(inputPath, pdfBuffer);
			await execFileAsync('qpdf', ['--decrypt', `--password=${password}`, inputPath, outputPath]);
			const decryptedBuffer = await readFile(outputPath);
			return decryptedBuffer;
		} catch (error) {
			const msg = (error as Error).message;
			if (msg.includes('ENOENT') || msg.includes('not found')) {
				throw new NodeOperationError(
					this.getNode(),
					'qpdf is not installed. Install it with: apt-get install qpdf (Linux) or brew install qpdf (macOS)',
					{ itemIndex },
				);
			}
			if (msg.includes('invalid password') || msg.includes('password')) {
				throw new NodeOperationError(
					this.getNode(),
					'Incorrect password for the encrypted PDF',
					{ itemIndex },
				);
			}
			throw new NodeOperationError(
				this.getNode(),
				`Failed to decrypt PDF: ${msg}`,
				{ itemIndex },
			);
		} finally {
			await unlink(inputPath).catch(() => {});
			await unlink(outputPath).catch(() => {});
		}
	}

	private async splitPdf(
		this: IExecuteFunctions,
		pdfBuffer: Buffer,
		originalFileName: string,
		outputBinaryProperty: string,
	): Promise<INodeExecutionData[]> {
		try {
			// Load PDF with pdf-lib
			const pdfDoc = await PDFDocument.load(pdfBuffer);
			const pageCount = pdfDoc.getPageCount();

			const results: INodeExecutionData[] = [];
			const baseFileName = originalFileName.replace(/\.pdf$/i, '');

			// Split each page (works for single-page PDFs too)
			for (let i = 0; i < pageCount; i++) {
				// Create new document with single page
				const newPdf = await PDFDocument.create();
				const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
				newPdf.addPage(copiedPage);

				// Save as buffer
				const pdfBytes = await newPdf.save();
				const buffer = Buffer.from(pdfBytes);

				// Create binary data
				const fileName = `${baseFileName}_page_${i + 1}.pdf`;
				const binaryData = await this.helpers.prepareBinaryData(
					buffer,
					fileName,
					'application/pdf',
				);

				results.push({
					json: {},
					binary: {
						[outputBinaryProperty]: binaryData,
					},
				});
			}

			return results;
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to split PDF: ${(error as Error).message}`,
			);
		}
	}
}
