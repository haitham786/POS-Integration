
export enum CommandType {
  Purchase = "100",
  Refund = "101",
  Void = "102",
  Duplicate = "104",
  GetTotals = "105",
  LastTransactionStatus = "106",
  GetStatus = "114",
  GetTerminalInfo = "109",
  Reconciliation = "112"
}

export interface EftResponse {
  commandType: string;
  errorCode: string;
  responseCode: string;
  amount?: string;
  txnStatus?: string;
  maskCardNumber?: string;
  receiptData?: string;
  errorDesc?: string;
}

export interface IntermediateMessage {
  description: string;
  code: string;
}

export const INTERMEDIATE_MESSAGES: Record<string, string> = {
  "001": "Insert Card",
  "002": "Card Inserted",
  "006": "Enter PIN",
  "007": "PIN Entered",
  "008": "Online Processing",
  "009": "Response Received",
  "010": "Printing Receipt",
  "012": "Card Removed",
  "013": "Transaction Successful",
  "014": "Transaction Failed",
  "030": "Card Tapped"
};
