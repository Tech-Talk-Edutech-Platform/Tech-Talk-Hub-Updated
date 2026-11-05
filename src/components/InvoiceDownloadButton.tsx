// InvoiceDownloadButton.js
import React, { useState, useEffect } from "react";
import { PDFDownloadLink, Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
import { supabase } from "../supabase"; // adjust path if needed

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  section: { marginBottom: 10 },
  header: { fontSize: 18, textAlign: "center", marginBottom: 20, fontWeight: "bold" },
  table: { display: "table", width: "auto", borderStyle: "solid", borderWidth: 1, marginBottom: 10 },
  tableRow: { flexDirection: "row" },
  tableColHeader: { width: "25%", borderStyle: "solid", borderWidth: 1, backgroundColor: "#f3f3f3", padding: 5, fontWeight: "bold" },
  tableCol: { width: "25%", borderStyle: "solid", borderWidth: 1, padding: 5 },
  logo: { width: 60, height: 60, marginBottom: 10, alignSelf: "center" },
  total: { textAlign: "right", fontWeight: "bold", marginTop: 5 },
  badge: {
    alignSelf: "flex-end",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
});

// PDF Document Component
const InvoicePDF = ({ invoice, customer, items, logoUrl }) => {
  // Determine badge color and text
  const badgeText = invoice.paid ? "PAID" : "UNPAID";
  const badgeColor = invoice.paid ? "#28a745" : "#dc3545";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {logoUrl && <Image src={logoUrl} style={styles.logo} />}
        <Text style={styles.header}>Receipt / Invoice</Text>

        {/* Badge */}
        <Text style={{ ...styles.badge, backgroundColor: badgeColor }}>{badgeText}</Text>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text>Invoice #: {invoice.invoice_number}</Text>
          <Text>Date: {new Date(invoice.date_created).toLocaleDateString()}</Text>
          {invoice.due_date && <Text>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Customer:</Text>
          <Text>{customer.name}</Text>
          <Text>{customer.email}</Text>
          <Text>{customer.phone}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableColHeader}>Description</Text>
            <Text style={styles.tableColHeader}>Qty</Text>
            <Text style={styles.tableColHeader}>Unit Price</Text>
            <Text style={styles.tableColHeader}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.tableCol}>{item.description}</Text>
              <Text style={styles.tableCol}>{item.quantity}</Text>
              <Text style={styles.tableCol}>KES {item.unit_price.toLocaleString()}</Text>
              <Text style={styles.tableCol}>KES {(item.quantity * item.unit_price).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>Grand Total: KES {invoice.total.toLocaleString()}</Text>
        <Text style={{ marginTop: 20, fontSize: 10, color: "#888" }}>Thank you for your business!</Text>
      </Page>
    </Document>
  );
};

// Main Button Component
export default function InvoiceDownloadButton({ invoice, customer, items, logoUrl, invoiceId }) {
  const [fetchedInvoice, setFetchedInvoice] = useState(invoice);
  const [fetchedCustomer, setFetchedCustomer] = useState(customer);
  const [fetchedItems, setFetchedItems] = useState(items || []);

  // Fetch from Supabase if invoiceId is provided
  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoiceData = async () => {
      const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      if (!inv) return;

      const { data: cust } = await supabase.from("customers").select("*").eq("id", inv.customer_id).single();
      const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);

      setFetchedInvoice(inv);
      setFetchedCustomer(cust);
      setFetchedItems(invItems || []);
    };

    fetchInvoiceData();
  }, [invoiceId]);

  if (!fetchedInvoice || !fetchedCustomer) return <p>Loading invoice...</p>;
  const handleInvoiceStatus = async (invoiceId, paid) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ paid })
        .eq("id", invoiceId);
      if (error) throw error;
      toast.success("Invoice status updated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={fetchedInvoice} customer={fetchedCustomer} items={fetchedItems} logoUrl={logoUrl} />}
      fileName={`Invoice-${fetchedInvoice.invoice_number}.pdf`}
      className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition"
    >
      {({ loading }) => (loading ? "Generating PDF..." : "Download PDF Receipt")}
    </PDFDownloadLink>
  );
}
// // InvoiceDownloadButton.js
// import React, { useState, useEffect } from "react";
// import { PDFDownloadLink, Page, Text, View, Document, StyleSheet, Image } from "@react-pdf/renderer";
// import { supabase } from "../supabase"; // adjust path if needed

// // PDF Styles
// const styles = StyleSheet.create({
//   page: { padding: 30, fontSize: 12 },
//   section: { marginBottom: 10 },
//   header: { fontSize: 18, textAlign: "center", marginBottom: 20, fontWeight: "bold" },
//   table: { display: "table", width: "auto", borderStyle: "solid", borderWidth: 1, marginBottom: 10 },
//   tableRow: { flexDirection: "row" },
//   tableColHeader: { width: "25%", borderStyle: "solid", borderWidth: 1, backgroundColor: "#f3f3f3", padding: 5, fontWeight: "bold" },
//   tableCol: { width: "25%", borderStyle: "solid", borderWidth: 1, padding: 5 },
//   logo: { width: 60, height: 60, marginBottom: 10, alignSelf: "center" },
//   total: { textAlign: "right", fontWeight: "bold", marginTop: 5 }
// });

// // PDF Document Component
// const InvoicePDF = ({ invoice, customer, items, logoUrl }) => (
//   <Document>
//     <Page size="A4" style={styles.page}>
//       {logoUrl && <Image src={logoUrl} style={styles.logo} />}
//       <Text style={styles.header}>Receipt / Invoice</Text>

//       {/* Customer Info */}
//       <View style={styles.section}>
//         <Text>Invoice #: {invoice.invoice_number}</Text>
//         <Text>Date: {new Date(invoice.date_created).toLocaleDateString()}</Text>
//         {invoice.due_date && <Text>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Text>}
//       </View>

//       <View style={styles.section}>
//         <Text style={{ fontWeight: "bold", marginBottom: 5 }}>Customer:</Text>
//         <Text>{customer.name}</Text>
//         <Text>{customer.email}</Text>
//         <Text>{customer.phone}</Text>
//       </View>

//       {/* Items Table */}
//       <View style={styles.table}>
//         <View style={styles.tableRow}>
//           <Text style={styles.tableColHeader}>Description</Text>
//           <Text style={styles.tableColHeader}>Qty</Text>
//           <Text style={styles.tableColHeader}>Unit Price</Text>
//           <Text style={styles.tableColHeader}>Total</Text>
//         </View>
//         {items.map((item, i) => (
//           <View key={i} style={styles.tableRow}>
//             <Text style={styles.tableCol}>{item.description}</Text>
//             <Text style={styles.tableCol}>{item.quantity}</Text>
//             <Text style={styles.tableCol}>KES {item.unit_price.toLocaleString()}</Text>
//             <Text style={styles.tableCol}>KES {(item.quantity * item.unit_price).toLocaleString()}</Text>
//           </View>
//         ))}
//       </View>

//       <Text style={styles.total}>Grand Total: KES {invoice.total.toLocaleString()}</Text>
//       <Text style={{ marginTop: 20, fontSize: 10, color: "#888" }}>Thank you for your business!</Text>
//     </Page>
//   </Document>
// );

// // Main Button Component
// export default function InvoiceDownloadButton({ invoice, customer, items, logoUrl, invoiceId }) {
//   const [fetchedInvoice, setFetchedInvoice] = useState(invoice);
//   const [fetchedCustomer, setFetchedCustomer] = useState(customer);
//   const [fetchedItems, setFetchedItems] = useState(items || []);

//   // fetch from Supabase if invoiceId is provided
//   useEffect(() => {
//     if (!invoiceId) return;

//     const fetchInvoiceData = async () => {
//       const { data: inv } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
//       if (!inv) return;

//       const { data: cust } = await supabase.from("customers").select("*").eq("id", inv.customer_id).single();
//       const { data: invItems } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);

//       setFetchedInvoice(inv);
//       setFetchedCustomer(cust);
//       setFetchedItems(invItems || []);
//     };

//     fetchInvoiceData();
//   }, [invoiceId]);

//   if (!fetchedInvoice || !fetchedCustomer) return <p>Loading invoice...</p>;

//   return (
//     <PDFDownloadLink
//       document={<InvoicePDF invoice={fetchedInvoice} customer={fetchedCustomer} items={fetchedItems} logoUrl={logoUrl} />}
//       fileName={`Invoice-${fetchedInvoice.invoice_number}.pdf`}
//       className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition"
//     >
//       {({ loading }) => (loading ? "Generating PDF..." : "Download PDF Receipt")}
//     </PDFDownloadLink>
//   );
// }