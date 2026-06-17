/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/copy-button'
import {
  buildCreatedRedemptionCodesText,
  buildRedemptionCodesFilename,
  downloadRedemptionCodesText,
  getCreatedRedemptionCodeCount,
} from '../lib/redemption-summary'

type CreatedRedemptionCodesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  codes: string[]
  name: string
}

export function CreatedRedemptionCodesDialog(
  props: CreatedRedemptionCodesDialogProps
) {
  const { t } = useTranslation()

  const codesText = useMemo(
    () => buildCreatedRedemptionCodesText(props.codes),
    [props.codes]
  )
  const codeCount = useMemo(
    () => getCreatedRedemptionCodeCount(props.codes),
    [props.codes]
  )
  const filename = useMemo(
    () => buildRedemptionCodesFilename(props.name),
    [props.name]
  )

  const handleDownload = () => {
    downloadRedemptionCodesText(codesText, filename)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>{t('Created Redemption Codes')}</DialogTitle>
          <DialogDescription>
            {t(
              'Save these {{count}} redemption codes now. They are shown only for this creation batch.',
              { count: codeCount }
            )}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          readOnly
          value={codesText}
          className='max-h-[50vh] min-h-48 resize-none font-mono text-sm'
          aria-label={t('Created redemption codes')}
        />

        <DialogFooter className='grid grid-cols-3 gap-2 sm:flex'>
          <CopyButton
            value={codesText}
            variant='outline'
            size='default'
            tooltip={t('Copy all created codes')}
            successTooltip={t('Codes copied!')}
            aria-label={t('Copy all created codes')}
          >
            {t('Copy')}
          </CopyButton>
          <Button
            type='button'
            variant='outline'
            onClick={handleDownload}
            disabled={!codesText}
          >
            {t('Download')}
          </Button>
          <Button type='button' onClick={() => props.onOpenChange(false)}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
