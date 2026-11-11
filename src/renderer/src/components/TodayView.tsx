import type { Canvas, WorkObject, WorkObjectUpdate } from '@shared/types'
import WorkObjectList from './WorkObjectList'

interface TodayViewProps {
  objects: WorkObject[]
  stacks: Canvas[]
  onMoveToInbox: (id: string) => Promise<string | null>
  onPlaceOnStack: (objectId: string, stackId: string) => Promise<string | null>
  onUpdate: (id: string, input: WorkObjectUpdate) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}

export default function TodayView({
  objects,
  stacks,
  onMoveToInbox,
  onPlaceOnStack,
  onUpdate,
  onDelete
}: TodayViewProps) {
  return (
    <WorkObjectList
      status="today"
      eyebrow="Today"
      heading="What you're moving today"
      description="No calendar sync — just a focus list. Place on a stack when you're ready to share."
      emptyMessage="Nothing for Today. Move items here from Inbox when you're ready to work them."
      objects={objects}
      stacks={stacks}
      moveLabel="Move to Inbox"
      onMove={onMoveToInbox}
      onPlaceOnStack={onPlaceOnStack}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}
