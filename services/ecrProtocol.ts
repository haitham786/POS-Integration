
import { CommandType, EftResponse } from '../types';

/**
 * ECR Protocol Constants
 */
const STX = 0x02;
const ETX = 0x03;
const ACK = 0x06;

/**
 * Utility to calculate Longitudinal Redundancy Check (LRC)
 * LRC is calculated by excluding STX, including XML Data and ETX.
 */
export const calculateLRC = (data: Uint8Array): number => {
  let lrc = 0;
  for (let i = 0; i < data.length; i++) {
    lrc ^= data[i];
  }
  return lrc;
};

/**
 * Build a raw byte frame for a command
 */
export const buildFrame = (xmlData: string): Uint8Array => {
  const encoder = new TextEncoder();
  const xmlBytes = encoder.encode(xmlData);
  
  // Frame: [STX] [XML DATA...] [ETX] [LRC]
  const frameLength = xmlBytes.length + 3;
  const frame = new Uint8Array(frameLength);
  
  frame[0] = STX;
  frame.set(xmlBytes, 1);
  frame[xmlBytes.length + 1] = ETX;
  
  // Calculate LRC: XOR of data from index 1 (XML) to index length-2 (ETX)
  const dataForLRC = frame.slice(1, xmlBytes.length + 2);
  frame[xmlBytes.length + 2] = calculateLRC(dataForLRC);
  
  return frame;
};

/**
 * Convert a numeric amount to the protocol's fixed format.
 * For OMR: 1.250 OMR should be sent as "1250" (Baizas).
 */
export const formatAmount = (amount: number): string => {
  return Math.round(amount * 1000).toString();
};

/**
 * Build XML for Purchase command
 */
export const buildPurchaseXml = (amount: number, mref: string = ""): string => {
  return `<EFTData><CommandType>${CommandType.Purchase}</CommandType><Amount>${formatAmount(amount)}</Amount>${mref ? `<MREFValue>${mref}</MREFValue>` : ""}</EFTData>`;
};

/**
 * Parse an incoming XML response from the POS
 */
export const parseResponse = (xml: string): Partial<EftResponse> => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "text/xml");
    const eftData = xmlDoc.getElementsByTagName("EFTData")[0];
    
    if (!eftData) return { errorCode: "E999", errorDesc: "Invalid XML" };

    const getVal = (tag: string) => eftData.getElementsByTagName(tag)[0]?.textContent || "";

    return {
      commandType: getVal("CommandType"),
      errorCode: getVal("ErrorCode"),
      responseCode: getVal("ResponseCode"),
      amount: getVal("Amount"),
      txnStatus: getVal("TxnStatus"),
      maskCardNumber: getVal("MaskCardNumber"),
      receiptData: getVal("ReceiptData"),
    };
  } catch (e) {
    return { errorCode: "E999", errorDesc: "Parse Error" };
  }
};

/**
 * Helper to convert Uint8Array to Hex string for logging
 */
export const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
};
