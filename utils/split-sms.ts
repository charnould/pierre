import { count } from 'sms-length'

export const split_sms = (sms: string) => {
  // CM.com allows max 10 "parts" per SMS,
  // so if it's less, we can send it that way.
  const { messages } = count(sms)
  if (messages <= 10) return [sms]

  // Otherwise, we need to split it.
  let split_sms = sms.includes('\n') ? sms.split('\n') : sms.split('.')
  split_sms = split_sms.map((part) => part.trim().replace('.', '. ')).filter((part) => part !== '')

  const sms_to_send: string[] = []
  let part = ''
  let index = 0
  let part_counter = 0

  for (const el of split_sms) {
    const { messages } = count(el)
    part_counter += messages

    // If it's the last part of split sms,
    // then push it to final SMS.
    if (index === split_sms.length - 1) sms_to_send.push(el)

    // If part number is lower than 10,
    // continue to add part to former part...
    if (part_counter < 10) {
      part += el
      index++
    } else {
      sms_to_send.push(part)
      part = ''
      part_counter = 0
      index++
    }
  }

  return sms_to_send
}
