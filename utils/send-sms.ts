export const send_sms = async ({ from, to, message }) => {
  try {
    // https://developers.cm.com/messaging/docs/integration
    const response = await fetch('https://gw.messaging.cm.com/v1.0/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        messages: {
          authentication: { productToken: Bun.env.SMS_API_KEY },
          msg: [
            {
              from: from,
              to: [{ number: to }],
              body: { type: 'auto', content: message },
              reference: 'n/a'
            }
          ]
        }
      })
    })

    const data = await response.json()
    data.message = message
    console.log('###### CM.com response ######\n', data)
  } catch (error) {
    console.error(error)
  }

  return
}
