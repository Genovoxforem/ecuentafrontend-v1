// Parses the Accessories picker of fichinter/create.php (the Job Card create page).
// The page's own PHP loops over the active rows of llx_jobcardaccessories and prints
// one toggle per accessory into `#accessories_container`:
//   <input type="checkbox" class="btn-check" id="3" name="ass_id[]" value="3">
//   <label class="btn btn-outline-primary" for="3">Pouch</label>
// Verified against the dev backend (five real accessories on one, none on the other).

export interface JobCardAccessory {
  id: number
  label: string
}

export function parseJobCardAccessories(doc: Document): JobCardAccessory[] {
  const container = doc.querySelector('#accessories_container')
  if (!container) throw new Error('The accessories on this backend page were not recognised.')
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[name="ass_id[]"]'))
    .map((input) => {
      const id = Number(input.getAttribute('value'))
      const label = (container.querySelector(`label[for="${input.id}"]`)?.textContent ?? '').replace(/\s+/g, ' ').trim()
      return { id, label }
    })
    .filter((a) => Number.isFinite(a.id) && a.id > 0 && a.label)
}
