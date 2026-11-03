import type { ComponentType } from 'react'

/**
 * The written half of an offer: everything Claude writes in the studio, in offers/<slug>/content.tsx.
 * The numbers (modules, prices, monthly fee, timeline) and the contract come from the CRM, never from here.
 * Every piece of text is bilingual; the page shows Hebrew (right-to-left) or English.
 */

export type Lang = 'he' | 'en'
/** Text in both languages. */
export interface L {
  he: string
  en: string
}

export interface ScreenProps {
  lang: Lang
}
/** A mockup screen: a React component rendered inside a phone or desktop frame. */
export type Screen = ComponentType<ScreenProps>

export interface FlowStep {
  /** Key into `screens` */
  screen: string
  title: L
  caption: L
}

/** A walkthrough of the product: screens shown one after another inside a device frame. */
export interface Flow {
  id: string
  device: 'phone' | 'desktop'
  title: L
  caption: L
  steps: FlowStep[]
}

export interface Section {
  title: L
  body: L
  points?: L[]
}

export interface ArchitectureLayer {
  name: L
  items: { label: L; /** Links the box to a priced module */ moduleId?: string }[]
}

export interface OfferContent {
  /** Which language the page opens in */
  defaultLang: Lang
  client: {
    name: L
    /** Path under /public (e.g. /offers/honey/logo.png) or a full https URL */
    logo?: string
    /** Optional brand colour for accents, e.g. "#f59e0b" */
    accent?: string
  }
  hero: { eyebrow: L; title: L; summary: L }
  /** Extra facts for the summary card (prices, timeline and module count are added automatically) */
  facts?: { label: L; value: L }[]
  need: Section
  solution: Section
  architecture?: { title: L; intro?: L; layers: ArchitectureLayer[] }
  flows: Flow[]
  /** Optional screenshots (e.g. of the client's current site): /offers/<slug>/... */
  gallery?: { src: string; caption: L }[]
  /** Copy for each priced module, keyed by the module id set in the CRM */
  modules: Record<string, { title: L; summary: L; bullets?: L[] }>
  phases: { title: L; when: L; body: L }[]
  decisions?: { question: L; impact: L; due: L }[]
  about?: Section
  nextSteps: Section
}

export interface OfferDefinition {
  content: OfferContent
  screens: Record<string, Screen>
}
