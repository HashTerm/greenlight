/** @jsxImportSource chat */
import { Actions, Button, Card, CardText } from "chat";

export interface PromptCardOption {
  optionId: string;
  label: string;
  actionKey: string;
}

export function buildPromptCard(
  text: string,
  options: PromptCardOption[],
) {
  return (
    <Card title="Prompt">
      <CardText>{text}</CardText>
      {options.length > 0 ? (
        <Actions>
          {options.map((opt) => (
            <Button key={opt.actionKey} id={opt.actionKey}>
              {opt.label}
            </Button>
          ))}
        </Actions>
      ) : null}
    </Card>
  );
}
