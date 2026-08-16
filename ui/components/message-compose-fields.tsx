import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MESSAGE_TEXT_PLACEHOLDER } from '@/lib/form-placeholders'

export function MessageComposeFields() {
  return (
    <div className="space-y-2">
      <Label htmlFor="text">Message</Label>
      <Textarea id="text" name="text" placeholder={MESSAGE_TEXT_PLACEHOLDER} required />
    </div>
  )
}
