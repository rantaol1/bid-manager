import type pptxgen from 'pptxgenjs'
import type { ProposalData } from '@/lib/documents/proposal-data'

/** A content-slide builder. Receives the running content-slide number for the footer. */
export type SlideBuilder = (pptx: pptxgen, data: ProposalData, slideNumber: number) => void
