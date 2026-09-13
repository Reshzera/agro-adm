import { useEffect, useRef } from 'react'
import { isStaticToolUIPart, type UIMessage } from 'ai'
import { parseWorkspaceCommand, workspaceToolNames, type WorkspaceToolName } from './workspace.commands'
import { workspaceStore } from './workspace.store'

export const workspaceToolParts = workspaceToolNames.map((name) => `tool-${name}`)

type SubmitToolOutput = (tool: string, toolCallId: string, output: unknown) => void

function runWorkspaceCommand(tool: WorkspaceToolName, input: unknown) {
  const parsed = parseWorkspaceCommand(tool, input)
  if (!parsed.ok) return { status: 'rejected', error: parsed.error }

  const replaced = workspaceStore.getState().current
  workspaceStore.dispatch({ type: 'open', view: parsed.view })
  return { status: 'opened', view: parsed.view, replaced: replaced !== null }
}

export function useWorkspaceTools(messages: UIMessage[], submitToolOutput: SubmitToolOutput) {
  const answered = useRef(new Set<string>())

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isStaticToolUIPart(part) || part.state !== 'input-available') continue
        const tool = workspaceToolNames.find((name) => part.type === `tool-${name}`)
        if (!tool || answered.current.has(part.toolCallId)) continue
        answered.current.add(part.toolCallId)
        submitToolOutput(tool, part.toolCallId, runWorkspaceCommand(tool, part.input))
      }
    }
  }, [messages, submitToolOutput])
}
