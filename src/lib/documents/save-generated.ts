import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/storage'

interface SaveArgs {
  opportunityId: string
  userId: string
  name: string
  type: string // e.g. 'estimate' | 'pricing' | 'timeline' | 'summary'
  fileName: string
  mimeType: string
  buffer: Buffer
}

/**
 * Upload a generated document and attach it as a deliverable.
 * If a deliverable of the same type already exists, a new version is added;
 * otherwise a new deliverable is created. Atomic via a transaction.
 */
export async function saveGeneratedDeliverable({
  opportunityId,
  userId,
  name,
  type,
  fileName,
  mimeType,
  buffer,
}: SaveArgs) {
  // The storage wrapper takes a File — wrap the buffer (File is global in Node 20).
  const file = new File([new Uint8Array(buffer)], fileName, { type: mimeType })
  const blob = await uploadFile(file, `opportunities/${opportunityId}/generated`)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.deliverable.findFirst({
      where: { opportunityId, type },
      orderBy: { createdAt: 'asc' },
    })

    if (existing) {
      const nextVersion = existing.currentVersion + 1
      await tx.deliverableVersion.create({
        data: {
          deliverableId: existing.id,
          version: nextVersion,
          fileUrl: blob.url,
          fileName: blob.fileName,
          fileSize: blob.size,
          mimeType: blob.mimeType,
          changeSummary: 'Regenerated from current data',
          createdBy: userId,
        },
      })
      const updated = await tx.deliverable.update({
        where: { id: existing.id },
        data: { currentVersion: nextVersion, updatedAt: new Date() },
      })
      await tx.activity.create({
        data: {
          opportunityId,
          type: 'deliverable',
          description: `Regenerated "${name}" (v${nextVersion})`,
          metadata: { deliverableId: existing.id, version: nextVersion },
          createdBy: userId,
        },
      })
      return updated
    }

    const created = await tx.deliverable.create({
      data: { opportunityId, name, type, currentVersion: 1, createdBy: userId },
    })
    await tx.deliverableVersion.create({
      data: {
        deliverableId: created.id,
        version: 1,
        fileUrl: blob.url,
        fileName: blob.fileName,
        fileSize: blob.size,
        mimeType: blob.mimeType,
        changeSummary: 'Generated from current data',
        createdBy: userId,
      },
    })
    await tx.activity.create({
      data: {
        opportunityId,
        type: 'deliverable',
        description: `Generated "${name}"`,
        metadata: { deliverableId: created.id },
        createdBy: userId,
      },
    })
    return created
  })
}
