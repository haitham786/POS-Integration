import { toHex } from './ecrProtocol';

/**
 * Interface for the global Android object injected by the Native WebView
 */
interface AndroidPOS {
  sendToUsb: (hexData: string) => void;
  isUsbConnected: () => boolean;
  requestUsbPermission: () => void;
}

declare global {
  interface Window {
    AndroidPOS?: AndroidPOS;
    onNativeMessage?: (data: string) => void;
  }
}

export class NativeBridge {
  private static instance: NativeBridge;
  private onDataCallback?: (data: string) => void;
  private buffer: string = "";

  private constructor() {
    // This callback is triggered by the Java NativePOSBridge.java
    window.onNativeMessage = (data: string) => {
      console.log("[Hardware Stream]:", data);
      
      // ECR Protocol logic: Messages start with STX (0x02) and end with ETX (0x03) + LRC
      this.buffer += data;
      
      // Basic check for XML structure completion
      if (this.buffer.includes("</EFTData>")) {
        const start = this.buffer.indexOf("<EFTData>");
        const end = this.buffer.indexOf("</EFTData>") + 10;
        if (start !== -1) {
          const completeXml = this.buffer.substring(start, end);
          if (this.onDataCallback) this.onDataCallback(completeXml);
          this.buffer = ""; // Clear buffer after successful parse
        }
      }
    };
  }

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  public isNativeAvailable(): boolean {
    return !!window.AndroidPOS;
  }

  public checkConnection(): boolean {
    if (window.AndroidPOS) {
      return window.AndroidPOS.isUsbConnected();
    }
    return false;
  }

  public requestPermission() {
    if (window.AndroidPOS) {
      window.AndroidPOS.requestUsbPermission();
    }
  }

  public sendCommand(bytes: Uint8Array, onResponse: (data: string) => void) {
    this.onDataCallback = onResponse;
    const hexString = toHex(bytes).replace(/\s/g, '');
    
    if (window.AndroidPOS) {
      console.log("[Bridge] Sending Command:", hexString);
      window.AndroidPOS.sendToUsb(hexString);
    } else {
      console.warn("[Bridge] Simulation Mode: No Native Hardware Found.");
      setTimeout(() => {
        const mockResponse = `<EFTData><CommandType>100</CommandType><ErrorCode>E000</ErrorCode><ResponseCode>APPROVED</ResponseCode><TxnStatus>OK</TxnStatus></EFTData>`;
        if (this.onDataCallback) this.onDataCallback(mockResponse);
      }, 3000);
    }
  }
}