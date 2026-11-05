declare module 'africastalking' {
  interface SmsMessage {
    to: string
    message: string
    from?: string
  }

  interface SmsClient {
    send(message: SmsMessage): Promise<unknown>
  }

  interface AfricaTalkingClient {
    SMS: SmsClient
  }

  function createAfricaTalking(config: {
    username?: string
    apiKey?: string
  }): AfricaTalkingClient

  export = createAfricaTalking
}
