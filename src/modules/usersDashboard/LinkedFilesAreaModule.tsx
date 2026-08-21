import { LinkedFilesArea } from '../../features/users/components/LinkedFilesArea'

export function LinkedFilesAreaModule() {
  return <LinkedFilesArea />
}

export function LinkedFilesManualTreeModule() {
  return <LinkedFilesArea defaultTab="manual" />
}

export function LinkedFilesAutomaticTreeModule() {
  return <LinkedFilesArea defaultTab="automatic" />
}
