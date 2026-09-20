import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { Invoice } from '../types/index.js';
import { getApiBaseUrl } from '../api/client.js';

interface ReceiptModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, onClose }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!invoice) return null;

  const paidAmount =
    invoice.order?.payments && invoice.order.payments.length > 0
      ? invoice.order.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : invoice.grandTotal;
  const changeDue = Math.max(0, paidAmount - invoice.grandTotal);

  const generateReceiptHtml = () => {
    const rName = invoice.restaurant?.name || 'RESTAURANT SMART POS';
    const rAddr = invoice.restaurant?.address || '128 Gourmet Boulevard, City Center';
    const rPhone = invoice.restaurant?.phone || '+1 (555) 839-2041';
    const itemsHtml = (invoice.order?.items || [])
      .map(
        (item) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <div style="flex: 1; padding-right: 6px;">
            <div>${item.menuItem?.name || 'Item'}</div>
            ${item.notes ? `<div style="font-size: 10px; color: #666;">* ${item.notes}</div>` : ''}
          </div>
          <div style="width: 60px; text-align: center;">${item.quantity} x $${item.unitPrice.toFixed(2)}</div>
          <div style="width: 55px; text-align: right; font-weight: bold;">$${(item.quantity * item.unitPrice).toFixed(2)}</div>
        </div>`
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${invoice.invoiceNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 72mm;
      margin: 0 auto;
      padding: 2mm 0;
      color: #000;
      font-size: 11px;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .dash { border-top: 1px dashed #000; margin: 6px 0; }
    .double { border-top: 2px double #000; margin: 6px 0; }
    .title { font-size: 14px; font-weight: bold; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${rName}</div>
    <div>${rAddr}</div>
    <div>Tel: ${rPhone}</div>
  </div>
  <div class="dash"></div>
  <div>
    <div><b>Invoice:</b> ${invoice.invoiceNumber}</div>
    <div><b>Order:</b> ${invoice.order?.orderNumber || 'N/A'}</div>
    <div><b>Date:</b> ${new Date(invoice.createdAt).toLocaleString()}</div>
    <div><b>Table:</b> ${invoice.tableName}</div>
    <div><b>Server:</b> ${invoice.waiterName}</div>
    <div><b>Guest:</b> ${invoice.customerName}</div>
  </div>
  <div class="dash"></div>
  <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px;">
    <span>Item</span>
    <span>Qty x Rate</span>
    <span>Total</span>
  </div>
  <div style="padding-top: 4px;">
    ${itemsHtml || '<div>No items listed</div>'}
  </div>
  <div class="dash"></div>
  <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
  ${invoice.discount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span><span>-$${invoice.discount.toFixed(2)}</span></div>` : ''}
  <div style="display: flex; justify-content: space-between;"><span>Tax:</span><span>$${invoice.tax.toFixed(2)}</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Service Charge:</span><span>$${invoice.serviceCharge.toFixed(2)}</span></div>
  <div class="double"></div>
  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;"><span>GRAND TOTAL:</span><span>$${invoice.grandTotal.toFixed(2)}</span></div>
  <div class="dash"></div>
  <div style="display: flex; justify-content: space-between;"><span>Payment Method:</span><span>${invoice.paymentMethod}</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Amount Paid:</span><span>$${paidAmount.toFixed(2)}</span></div>
  ${changeDue > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Change:</span><span>$${changeDue.toFixed(2)}</span></div>` : ''}
  <div style="display: flex; justify-content: space-between;"><span>Status:</span><span>${invoice.paidStatus}</span></div>
  <div class="dash"></div>
  <div class="center" style="margin-top: 8px;">
    <div>*** THANK YOU FOR YOUR VISIT ***</div>
    <div style="font-size: 9px; color: #555; margin-top: 2px;">Restaurant Smart POS</div>
  </div>
</body>
</html>`;
  };

  const handleDownload = () => {
    try {
      const html = generateReceiptHtml();
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `receipt-${invoice.invoiceNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download receipt');
    }
  };

  const handlePrint = () => {
    try {
      setIsPrinting(true);
      setErrorMessage(null);

      const html = generateReceiptHtml();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error, falling back to window.print():', e);
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              setIsPrinting(false);
            }, 1000);
          }
        }, 200);
      } else {
        window.print();
        setIsPrinting(false);
      }
    } catch (err: any) {
      console.warn('Printing error, falling back to window.print():', err);
      window.print();
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900">Tax Invoice & Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 font-bold ml-2 text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Thermal Slip Simulation & Print Area */}
        <div
          id="thermal-receipt-print-area"
          className="p-6 overflow-y-auto bg-amber-50/20 font-mono text-xs text-gray-800 flex-1"
        >
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-gray-400">
            <h2 className="text-base font-bold text-gray-900 tracking-wider">RESTAURANT SMART POS</h2>
            <p className="text-gray-600 text-[11px]">128 Gourmet Boulevard, City Center</p>
            <p className="text-gray-600 text-[11px]">Tel: +1 (555) 839-2041 | Tax ID: US-920491-X</p>
          </div>

          <div className="py-3 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice No:</span>
              <span className="font-bold">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span>{new Date(invoice.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Table / Mode:</span>
              <span className="font-semibold">{invoice.tableName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Guest / Server:</span>
              <span>{invoice.customerName} ({invoice.waiterName})</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-gray-400">
            <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-gray-300">
              <span>Item</span>
              <span>Qty x Rate</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5 pt-2">
              {invoice.order?.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-2">
                    <div>{item.menuItem?.name || 'Item'}</div>
                    {item.notes && <div className="text-[10px] text-gray-500 italic">* {item.notes}</div>}
                  </div>
                  <div className="w-16 text-center text-gray-500">
                    {item.quantity} x ${(item.unitPrice).toFixed(2)}
                  </div>
                  <div className="w-16 text-right font-medium">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations */}
          <div className="py-3 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span>-${invoice.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Tax (VAT/GST):</span>
              <span>${invoice.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Service Charge:</span>
              <span>${invoice.serviceCharge.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t-2 border-gray-800 text-gray-900">
              <span>GRAND TOTAL:</span>
              <span>${invoice.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 text-[11px] text-gray-600">
              <span>Payment Method:</span>
              <span className="font-semibold text-gray-800">{invoice.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-600">
              <span>Paid Status:</span>
              <span className="font-semibold text-emerald-700">{invoice.paidStatus}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-600">
              <span>Paid Amount:</span>
              <span className="font-semibold text-gray-900">${paidAmount.toFixed(2)}</span>
            </div>
            {changeDue > 0 && (
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Change Due:</span>
                <span className="font-semibold text-gray-900">${changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="text-center pt-4 border-t border-dashed border-gray-400 text-[11px] text-gray-500 space-y-1">
            <p>Thank you for choosing Restaurant Smart POS!</p>
            <p className="text-[10px] text-gray-400">Wi-Fi: SmartPOS-Guest / Pass: welcome2026</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5 no-print">
          <button
            onClick={handleDownload}
            className="px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download receipt HTML/PDF file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Print 80mm Thermal Receipt</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

