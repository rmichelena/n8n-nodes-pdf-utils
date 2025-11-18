import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Disable worker to avoid canvas/DOM dependencies
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

export class PdfUtils implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Utils',
		name: 'pdfUtils',
		icon: 'file:pdf.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Inspect and split PDF files using pure npm packages',
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
						description: 'Analyze PDF structure and detect if it is vectorial',
						action: 'Inspect PDF file',
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
						operation: ['inspect'],
					},
				},
				default: 50,
				description: 'Minimum text length to consider PDF as vectorial (text-based)',
			},
			{
				displayName: 'Output Binary Property',
				name: 'outputBinaryProperty',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['split'],
					},
				},
				default: 'data',
				description: 'Name for the output binary property of split PDFs',
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
						json: result,
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

					// Add each page as a separate item
					splitResults.forEach((splitItem: INodeExecutionData, pageIndex: number) => {
						returnData.push({
							json: {
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
			// Load PDF with pdfjs-dist in headless mode (no canvas required)
			const loadingTask = pdfjsLib.getDocument({
				data: new Uint8Array(pdfBuffer),
				verbosity: 0,
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
				pageCount,
				isMultiPage,
				isVectorial,
				textLength,
				firstPageText: text.substring(0, 200), // Preview of first 200 chars
			};
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				`Failed to inspect PDF: ${(error as Error).message}`,
				{ itemIndex },
			);
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

			if (pageCount < 2) {
				throw new Error('PDF must have at least 2 pages to split');
			}

			const results: INodeExecutionData[] = [];
			const baseFileName = originalFileName.replace(/\.pdf$/i, '');

			// Split each page
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
