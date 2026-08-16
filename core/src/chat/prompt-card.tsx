/** @jsxImportSource chat */
import { Actions, Button, Card, CardText } from 'chat'
import { TEXT_OPTION_ID, TYPE_ANSWER_BUTTON_LABEL } from '../services/prompts/pending-text.js'

export interface PromptCardOption {
  optionId: string
  label: string
  actionKey: string
}

export function buildPromptCard(
  promptId: string,
  text: string,
  options: PromptCardOption[],
  allowText = false,
) {
  const textActionKey = `${promptId}:${TEXT_OPTION_ID}`
  const showActions = options.length > 0 || allowText

  return (
    <Card title={`Prompt ${promptId}`}>
      <CardText>{text}</CardText>
      {showActions ? (
        <Actions>
          {options.map((opt) => (
            <Button key={opt.actionKey} id={opt.actionKey}>
              {opt.label}
            </Button>
          ))}
          {allowText ? (
            <Button key={textActionKey} id={textActionKey}>
              {TYPE_ANSWER_BUTTON_LABEL}
            </Button>
          ) : null}
        </Actions>
      ) : null}
    </Card>
  )
}
