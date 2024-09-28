import { expect, test } from 'bun:test'
import { parse_incoming_sms } from '../../utils/parse-incoming-sms'

test('should get config from phone number', async () => {
  {
    //
    //
    //
    // Test 1
    //
    const path = './tests/utils/__mocks__/incoming_sms_1.json'
    const file = Bun.file(path)
    const data = await file.json()

    const config_1 = await parse_incoming_sms(data)

    expect(config_1).toStrictEqual({
      config: 'pierre-ia.org',
      conv_id: 'sms-with-+33611834431',
      phone: '+339_pierre_by_sms',
      role: 'user',
      to: '+33611834431',
      content: 'This is an example message from 1'
    })
  }

  {
    //
    //
    //
    // Test 2
    //
    const path = './tests/utils/__mocks__/incoming_sms_2.json'
    const file = Bun.file(path)
    const data = await file.json()

    const config_2 = await parse_incoming_sms(data)

    expect(config_2).toBe(null)
  }
})
