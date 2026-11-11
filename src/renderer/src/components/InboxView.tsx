import type { Canvas, WorkObject, WorkObjectUpdate } from '@shared/types'
import WorkObjectList from './WorkObjectList'

interface InboxViewProps {
  objects: WorkObject[]
  stacks: Canvas[]
  onMoveToToday: (id: string) => Promise<string | null>
  onPlaceOnStack: (objectId: string, stackId: string) => Promise<string | null>
  onUpdate: (id: string, input: WorkObjectUpdate) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
}

export default function InboxView({
  objects,
  stacks,
  onMoveToToday,
  onPlaceOnStack,
  onUpdate,
  onDelete
}: InboxViewProps) {
  return (
    <WorkObjectList
      status="inbox"
      eyebrow="Inbox"
      heading="Captured, not placed yet"
      description="Option + Space lands here by default. Place items on a stack when you're ready to shape a brief."
      emptyMessage="Nothing in Inbox. Press Option + Space to capture from anywhere."
      objects={objects}
      stacks={stacks}
      moveLabel="Move to Today"
      onMove={onMoveToToday}
      onPlaceOnStack={onPlaceOnStack}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  )
}
