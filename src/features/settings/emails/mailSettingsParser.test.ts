import { describe, expect, it } from 'vitest'
import { parseMailSettingsForm } from './mailSettingsParser'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

// Trimmed from the real admin/mails.php?action=edit response.
const FORM = `
<form autocomplete="off" method="post" action="/admin/mails.php">
<input type="hidden" name="token" value="tok1"><input type="hidden" name="action" value="update">
<div class="col"><label>Disable all email sending</label><select id="MAIN_DISABLE_ALL_MAILS" name="MAIN_DISABLE_ALL_MAILS"> <option value="1">Yes</option> <option value="0" selected="">No</option> </select></div>
<div class="col"><input class="form-control" name="MAIN_MAIL_FORCE_SENDTO" size="32" value="a@example.test"></div>
<div class="col"><select id="MAIN_MAIL_SENDMODE" name="MAIN_MAIL_SENDMODE"> <option value="mail" selected="">PHP mail function</option> <option value="smtps">SMTP/SMTPS socket library</option> </select></div>
<input class="form-control" id="MAIN_MAIL_SMTP_SERVER" name="MAIN_MAIL_SMTP_SERVER" value=""><input type="hidden" id="MAIN_MAIL_SMTP_SERVER_sav" name="MAIN_MAIL_SMTP_SERVER_sav" value="">
<input class="form-control" type="password" name="MAIN_MAIL_SMTPS_PW" size="32" value="s3cret" autocomplete="off">
<textarea class="form-control" id="MAIN_MAIL_EMAIL_DKIM_PRIVATE_KEY" name="MAIN_MAIL_EMAIL_DKIM_PRIVATE_KEY" rows="15" cols="100"></textarea>
<select name="MAIN_MAIL_DEFAULT_FROMTYPE"> <option value="user">User email</option> <option value="company" selected="">Company Email (co@example.test)</option> </select>
<input type="submit" name="save" value="Save"><input type="submit" name="cancel" value="Cancel">
</form>`

describe('parseMailSettingsForm', () => {
  it('reads the token and every MAIN_* control with its kind, value and options', () => {
    const form = parseMailSettingsForm(parse(FORM))
    expect(form.token).toBe('tok1')
    expect(form.fields.MAIN_DISABLE_ALL_MAILS).toEqual({
      name: 'MAIN_DISABLE_ALL_MAILS',
      kind: 'select',
      value: '0',
      options: [
        { value: '1', label: 'Yes' },
        { value: '0', label: 'No' },
      ],
    })
    expect(form.fields.MAIN_MAIL_FORCE_SENDTO).toMatchObject({ kind: 'input', value: 'a@example.test' })
    expect(form.fields.MAIN_MAIL_SENDMODE.value).toBe('mail')
    expect(form.fields.MAIN_MAIL_SMTPS_PW).toMatchObject({ kind: 'password', value: 's3cret' })
    expect(form.fields.MAIN_MAIL_EMAIL_DKIM_PRIVATE_KEY).toMatchObject({ kind: 'textarea', value: '' })
    expect(form.fields.MAIN_MAIL_DEFAULT_FROMTYPE.value).toBe('company')
  })

  it('ignores the *_sav helpers and refuses a page that is not the edit form', () => {
    expect(Object.keys(parseMailSettingsForm(parse(FORM)).fields)).not.toContain('MAIN_MAIL_SMTP_SERVER_sav')
    expect(() => parseMailSettingsForm(parse('<div>Access denied</div>'))).toThrow(/not recognised/)
  })
})
