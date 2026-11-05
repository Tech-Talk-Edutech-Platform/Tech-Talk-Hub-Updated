
import React from "react";
import { QRCodeSVG } from "qrcode.react";

export default function Receipt() {
  const receipt = {
    receipt_number: "TTH-1042",
    created_at: new Date(),
    customer_name: "John Doe",
    phone: "0700 000000",
    items: [
      { description: "Tuition Fee", qty: 1, amount: 3000 },
      { description: "Curriculum", qty: 1, amount: 2000 },
      { description: "LMS Access", qty: 1, amount: 5000 },
    ],
    discount: 2000,
    total_paid: 8000,
    payment_method: "M-Pesa",
    transaction_code: "QGH72KLM",
    status: "PAID",
    served_by: "Justin",
    email: "admin@techtalk-hub.com",
  };

  const subtotal = receipt.items.reduce((sum, i) => sum + i.amount * i.qty, 0);
  const qrLink = `https://techtalkhub.com/verify/${receipt.receipt_number}`;

  const printReceipt = () => window.print();

  return (
    <div
      id="receipt"
      className="w-full max-w-[380px] mx-auto bg-white shadow-xl rounded-sm p-8 font-mono border-t-4 border-black"
    >
      <div className="text-center border-b pb-2 mb-2">
        <h1 className="font-bold text-lg">TECH TALK HUB</h1>
        <p className="text-sm">We Teach Kids How To Code</p>
      </div>

      <p>Receipt No: {receipt.receipt_number}</p>
      <p>Date: {receipt.created_at.toLocaleDateString()}</p>
      <p>Time: {receipt.created_at.toLocaleTimeString()}</p>

      <div className="border-b my-2"></div>

      <p>Customer: {receipt.customer_name}</p>
      <p>Phone: {receipt.phone}</p>

      <div className="border-b my-2"></div>

      <div className="grid grid-cols-3 font-bold border-b pb-1">
        <span>DESCRIPTION</span>
        <span className="text-center">QTY</span>
        <span className="text-right">AMOUNT</span>
      </div>

      {receipt.items.map((item, i) => (
        <div key={i} className="grid grid-cols-3 py-1 border-b">
          <span>{item.description}</span>
          <span className="text-center">{item.qty}</span>
          <span className="text-right">{item.amount.toLocaleString()}</span>
        </div>
      ))}

      <div className="border-b my-2"></div>

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{subtotal.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-red-500">
        <span>Discount</span>
        <span>- {receipt.discount.toLocaleString()}</span>
      </div>
      <div className="flex justify-between font-bold text-lg border-t pt-1">
        <span>TOTAL PAID</span>
        <span>{receipt.total_paid.toLocaleString()}</span>
      </div>

      <div className="border-b my-2"></div>

      <p>Payment Method: {receipt.payment_method}</p>
      <p>Transaction Code: {receipt.transaction_code}</p>
      <p>Status: {receipt.status}</p>
      <p>Served By: {receipt.served_by}</p>

      <div className="border-b my-2"></div>

      <div className="flex flex-col items-center mt-6">
        <QRCodeSVG value={qrLink} size={120} />
        <p className="text-sm text-gray-500 mt-2">Scan to verify receipt</p>
      </div>

      <div className="border-b my-2"></div>

      <p className="text-center text-sm">Thank you for choosing Tech Talk Hub</p>
      <p className="text-center text-sm">{receipt.email}</p>
      <p className="text-center text-sm">{receipt.phone}</p>

      <button
        onClick={printReceipt}
        className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        Print / Save Receipt
      </button>
      {/* 
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style> */}
    </div>
  );
}
