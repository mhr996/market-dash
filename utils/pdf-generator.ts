import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFOptions {
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
}

/**
 * Generate PDF from HTML element
 * @param elementId - The ID of the HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise<void>
 */
export const generatePDFFromElement = async (elementId: string, options: PDFOptions = {}): Promise<void> => {
    const { filename = 'document.pdf', orientation = 'portrait', format = 'a4' } = options;

    try {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with ID '${elementId}' not found`);
        }

        // Show element temporarily if hidden
        const originalDisplay = element.style.display;
        const originalVisibility = element.style.visibility;
        element.style.display = 'block';
        element.style.visibility = 'visible';

        // Generate canvas from HTML element
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            removeContainer: true,
            imageTimeout: 0,
            logging: false,
        });

        // Restore original display properties
        element.style.display = originalDisplay;
        element.style.visibility = originalVisibility;

        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation,
            unit: 'mm',
            format,
        });

        // Calculate dimensions to fit page
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate scaling to fit page
        const widthRatio = pdfWidth / imgWidth;
        const heightRatio = pdfHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        // Center the image on the page
        const xOffset = (pdfWidth - scaledWidth) / 2;
        const yOffset = (pdfHeight - scaledHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
        pdf.save(filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

/**
 * Generate PDF from order data using a receipt template
 * @param orderData - The order data to generate PDF for
 * @param options - PDF generation options
 * @returns Promise<void>
 */
export const generateOrderReceiptPDF = async (orderData: any, options: PDFOptions = {}): Promise<void> => {
    const { filename = `order-${orderData.id}-receipt.pdf` } = options;

    try {
        // Create a temporary container for the receipt
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-receipt-container';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '-9999px';
        tempContainer.style.width = '800px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.style.padding = '20px';
        tempContainer.style.fontFamily = 'Arial, sans-serif';

        // Create receipt HTML
        const receiptHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding: 20px; background: white;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px;">
                    <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: bold;">PAZAR</h1>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Order Receipt</p>
                </div>

                <!-- Order Info -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                    <div>
                        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Order Details</h3>
                        <p style="margin: 5px 0; color: #666;"><strong>Order ID:</strong> #${orderData.id}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(orderData.date).toLocaleDateString()}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> ${orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}</p>
                    </div>
                    <div style="text-align: right;">
                        <h3 style="color: #333; margin: 0 0 10px 0; font-size: 18px;">Customer Information</h3>
                        <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${orderData.buyer}</p>
                        <p style="margin: 5px 0; color: #666;"><strong>Address:</strong> ${orderData.address}</p>
                    </div>
                </div>

                <!-- Items Table -->
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                        <thead>
                            <tr>
                                <th style="padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; color: #fff; margin-bottom: 8px">Item</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: #fff; margin-bottom: 8px">Quantity</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: #fff; margin-bottom: 8px">Price</th>
                                <th style="padding: 12px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: #fff; margin-bottom: 8px">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orderData.items
                                .map(
                                    (item: any) => `
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #ddd;">${item.name}</td>
                                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
                                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            `,
                                )
                                .join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Totals -->
                <div style="margin-left: auto; width: 300px;">
                    <div style="border: 1px solid #ddd; padding: 20px; background-color: #f8f9fa;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #666;">Subtotal:</span>
                            <span style="color: #666;">$${orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #666;">Tax (10%):</span>
                            <span style="color: #666;">$${(orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) * 0.1).toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #4f46e5; font-weight: bold; font-size: 18px;">
                            <span style="color: #333;">Total:</span>
                            <span style="color: #4f46e5;">$${(orderData.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) * 1.1).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; margin: 0; font-size: 14px;">Thank you for your business!</p>
                    <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">For questions about this order, please contact our support team.</p>
                </div>
            </div>
        `;

        tempContainer.innerHTML = receiptHTML;
        document.body.appendChild(tempContainer);

        // Generate PDF
        await generatePDFFromElement('temp-receipt-container', {
            filename,
            orientation: 'portrait',
            format: 'a4',
        });

        // Clean up
        document.body.removeChild(tempContainer);
    } catch (error) {
        console.error('Error generating order receipt PDF:', error);
        throw error;
    }
};

/**
 * Print element directly (browser print dialog)
 * @param elementId - The ID of the HTML element to print
 */
export const printElement = (elementId: string): void => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID '${elementId}' not found`);
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        console.error('Could not open print window');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                @media print {
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            ${element.outerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
};
