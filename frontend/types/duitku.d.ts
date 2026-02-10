declare module 'duitku' {
  interface DuitkuConfig {
    merchantCode: string;
    apiKey: string;
    sandbox?: boolean;
  }

  interface PaymentData {
    paymentAmount: number;
    merchantOrderId: string;
    productDetails: string;
    email: string;
    phoneNumber: string;
    customerVaName?: string;
    callbackUrl: string;
    returnUrl: string;
    expiryPeriod?: number;
    paymentMethod?: string;
  }

  export default class DuitkuClient {
    constructor(config: DuitkuConfig);

    getPaymentMethods(data: PaymentData): Promise<any>;
    createTransaction(data: PaymentData): Promise<string>;
  }
}
