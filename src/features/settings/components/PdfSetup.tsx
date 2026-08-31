import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useLanguageOptions } from '../../users/users.queries'
import { RealToggle } from './RealToggle'

const inputCls = 'w-28 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm text-right outline-none focus:ring-2 focus:ring-brand/30'
const selectCls = 'w-48 h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 appearance-none'

function YesNoSelect({ value, onChange }: { value: 'Yes' | 'No'; onChange: (v: 'Yes' | 'No') => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as 'Yes' | 'No')} className={selectCls + ' w-24'}>
      <option>No</option>
      <option>Yes</option>
    </select>
  )
}

function Row({ label, bold, children }: { label: string; bold?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 gap-4">
      <span className="text-sm text-brand max-w-3xl">
        {bold ? (
          <>
            {label.split(bold)[0]}
            <b className="text-text!">{bold}</b>
            {label.split(bold)[1]}
          </>
        ) : (
          label
        )}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  )
}

const PAPER_FORMATS = ['Format A4 - 210x297mm', 'Format A5 - 148x210mm', 'Format Letter - 215.9x279.4mm', 'Format Legal - 215.9x355.6mm', 'Format Executive - 190.5x254mm']
const FOOTER_DETAIL_OPTIONS = ['No', 'Display Company Address', 'Display Company Address And Manager Names']

const PAGE_HEADER = "Global options for PDF generation"

export function PdfSetup() {
  const { data: languages, isLoading: languagesLoading } = useLanguageOptions()

  const [paperFormat, setPaperFormat] = useState(PAPER_FORMATS[0])
  const [marginLeft, setMarginLeft] = useState('10')
  const [marginRight, setMarginRight] = useState('10')
  const [marginTop, setMarginTop] = useState('10')
  const [marginBottom, setMarginBottom] = useState('10')

  const [hideIntraCommunityVat, setHideIntraCommunityVat] = useState<'Yes' | 'No'>('No')
  const [showTpin, setShowTpin] = useState<'Yes' | 'No'>('No')
  const [showTrackingId, setShowTrackingId] = useState<'Yes' | 'No'>('Yes')
  const [showProfId3, setShowProfId3] = useState<'Yes' | 'No'>('No')
  const [showProfId4, setShowProfId4] = useState<'Yes' | 'No'>('No')
  const [showProfId5, setShowProfId5] = useState<'Yes' | 'No'>('No')
  const [showProfId6, setShowProfId6] = useState<'Yes' | 'No'>('No')

  const [hideVatInfo, setHideVatInfo] = useState<'Yes' | 'No'>('No')

  const [logoHeight, setLogoHeight] = useState('20')
  const [hideProductsDescription, setHideProductsDescription] = useState<'Yes' | 'No'>('No')
  const [hideProductsRef, setHideProductsRef] = useState<'Yes' | 'No'>('No')
  const [hideProductLinesDetails, setHideProductLinesDetails] = useState<'Yes' | 'No'>('No')
  const [swapAddresses, setSwapAddresses] = useState<'Yes' | 'No'>('No')
  const [useFrenchPosition, setUseFrenchPosition] = useState<'Yes' | 'No'>('No')
  const [footerDetail, setFooterDetail] = useState(FOOTER_DETAIL_OPTIONS[1])
  const [secondLanguage, setSecondLanguage] = useState('')

  const [saved, setSaved] = useState(false)
  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> PDF
      </h2>
      <p className="text-sm text-text-muted">{PAGE_HEADER}</p>

      <div>
        <h3 className="text-base font-semibold text-text! mb-2">Paper formats</h3>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameter</span>
            <span>Value</span>
          </div>
          <Row label="Paper Formats">
            <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value)} className={selectCls}>
              {PAPER_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Left Margin On PDF">
            <input value={marginLeft} onChange={(e) => setMarginLeft(e.target.value)} className={inputCls} />
          </Row>
          <Row label="Right Margin On PDF">
            <input value={marginRight} onChange={(e) => setMarginRight(e.target.value)} className={inputCls} />
          </Row>
          <Row label="Top Margin On PDF">
            <input value={marginTop} onChange={(e) => setMarginTop(e.target.value)} className={inputCls} />
          </Row>
          <Row label="Bottom Margin On PDF">
            <input value={marginBottom} onChange={(e) => setMarginBottom(e.target.value)} className={inputCls} />
          </Row>
        </Card>
      </div>

      <div>
        <h3 className="text-base font-semibold text-text! mb-2">Rules for address section</h3>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameter</span>
            <span>Value</span>
          </div>
          <Row label="Hide Intra-Community VAT Number With Addresses">
            <YesNoSelect value={hideIntraCommunityVat} onChange={setHideIntraCommunityVat} />
          </Row>
          <Row label="Show Professional Id With Addresses - Tpin">
            <YesNoSelect value={showTpin} onChange={setShowTpin} />
          </Row>
          <Row label="Show Professional Id With Addresses - Tracking Id">
            <YesNoSelect value={showTrackingId} onChange={setShowTrackingId} />
          </Row>
          <Row label="Show Professional Id With Addresses - Professional ID 3">
            <YesNoSelect value={showProfId3} onChange={setShowProfId3} />
          </Row>
          <Row label="Show Professional Id With Addresses - Professional ID 4">
            <YesNoSelect value={showProfId4} onChange={setShowProfId4} />
          </Row>
          <Row label="Show Professional Id With Addresses - Professional ID 5">
            <YesNoSelect value={showProfId5} onChange={setShowProfId5} />
          </Row>
          <Row label="Show Professional Id With Addresses - Professional ID 6">
            <YesNoSelect value={showProfId6} onChange={setShowProfId6} />
          </Row>
        </Card>
      </div>

      <div>
        <h3 className="text-base font-semibold text-text! mb-2">Rules for Sales Tax / VAT</h3>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameter</span>
            <span>Value</span>
          </div>
          <Row label="Hide All Information Related To Sales Tax / VAT">
            <YesNoSelect value={hideVatInfo} onChange={setHideVatInfo} />
          </Row>
        </Card>
      </div>

      <div>
        <h3 className="text-base font-semibold text-text! mb-2">Other</h3>
        <Card className="!h-auto !p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border text-sm font-semibold text-text!">
            <span>Parameter</span>
            <span>Value</span>
          </div>
          <Row label="Height For Logo On PDF">
            <input value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)} className={inputCls} />
          </Row>
          <Row label="Hide Products Description">
            <YesNoSelect value={hideProductsDescription} onChange={setHideProductsDescription} />
          </Row>
          <Row label="Hide Products Ref.">
            <YesNoSelect value={hideProductsRef} onChange={setHideProductsRef} />
          </Row>
          <Row label="Hide Product Lines Details">
            <YesNoSelect value={hideProductLinesDetails} onChange={setHideProductLinesDetails} />
          </Row>
          <Row label="Swap Sender And Recipient Address Position On PDF Documents">
            <YesNoSelect value={swapAddresses} onChange={setSwapAddresses} />
          </Row>
          <Row label="Use French Standard Position (La Poste) For Customer Address Position">
            <YesNoSelect value={useFrenchPosition} onChange={setUseFrenchPosition} />
          </Row>
          <Row label="Add More Details Into Footer, Such As Company Address Or Manager Names (In Addition To Professional Ids, Company Capital And VAT Number).">
            <select value={footerDetail} onChange={(e) => setFooterDetail(e.target.value)} className={selectCls + ' w-56'}>
              {FOOTER_DETAIL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Row>
          <Row label="If you want to have some texts in your PDF duplicated in 2 different languages in the same generated PDF, you must set here this second language so generated PDF will contains 2 different languages in same page, the one chosen when generating PDF and this one (only few PDF templates support this). Keep empty for 1 language per PDF.">
            <select value={secondLanguage} onChange={(e) => setSecondLanguage(e.target.value)} className={selectCls + ' w-56'} disabled={languagesLoading}>
              <option value="">Select a language</option>
              {(languages ?? []).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label='If the feature "Enable kits (set of several products)" of module Products is used, show details of subproducts of a kit on PDF.' bold="Enable kits (set of several products)">
            <RealToggle constName="SHOW_SUBPRODUCT_REF_IN_PDF" initial={false} />
          </Row>
        </Card>
      </div>

      {saved && (
        <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">
          Saved (session-only — the kit-subproducts toggle above saves live; no other PDF-config endpoint exists on this backend yet).
        </Card>
      )}

      <div>
        <button type="button" onClick={handleSave} className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-hover">
          Save
        </button>
      </div>
    </div>
  )
}
