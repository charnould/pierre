// Caution:
// CM supports a maximum of 10 `parts` per SMS (1 SMS = 1 grey/green bubble in the iOS Messages app).
// Currently, this function does not split or group by `parts`, nor does it verify SMS length`.
// While this may NOT cause issues, be mindful if users say they receive "incomplete" response.
export const split_sms = (sms: string) =>
  sms
    .split('\n')
    .map((part) => part.replace(/\n\n$/g, '').trim())
    .filter((part) => part !== '')
