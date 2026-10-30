import { useApp, pickData } from '@/state/store'
import { exportJson } from '@/state/persistence'
import { downloadFile } from '@/lib/clipboard'

export function exportScenarioFile() {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadFile(`compensation-cockpit-${stamp}.json`, exportJson(pickData(useApp.getState())))
}
