import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import type { Metadata } from '../../../utils/knowledge/generate-metadata'
import { ingest_files } from '../../../utils/knowledge/ingest-files'

const SERVICE = Bun.env['SERVICE']!
const FILES_DIR = `datastores/${SERVICE}/files`
const GHOST_FILE = `${FILES_DIR}/_test_ghost_file_for_ingest.md`

// Build a minimal valid Metadata entry for a file that does NOT exist on disk
function missingFileEntry(): Metadata {
  return {
    filename: 'nonexistent_doc.md',
    agent_filename: 'Document inexistant',
    filepath: `${FILES_DIR}/nonexistent_doc.md`,
    type: 'md',
    sheet: 0,
    headers: 0,
    access: 'default',
    last_modified: '2024-01-01T00:00:00+00:00'
  }
}

describe('ingest_files', () => {
  describe('PROFILE_MISSING_IN_ASSETS', () => {
    it('should emit anomaly when access references a non-existent config', async () => {
      const entry: Metadata = {
        filename: 'doc.md',
        agent_filename: 'Doc',
        filepath: `${FILES_DIR}/doc.md`,
        type: 'md',
        sheet: 0,
        headers: 0,
        access: 'ghost_profile_xyz_not_real',
        last_modified: '2024-01-01T00:00:00+00:00'
      }

      const { anomalies } = await ingest_files([entry])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('PROFILE_MISSING_IN_ASSETS')
      const a = anomalies.find((x) => x.code === 'PROFILE_MISSING_IN_ASSETS')
      expect(a?.subject).toBe('ghost_profile_xyz_not_real')
    })
  })

  describe('METADATA_NOT_IN_FILES', () => {
    it('should emit anomaly when file is in metadata but absent from disk', async () => {
      const { anomalies } = await ingest_files([missingFileEntry()])
      const codes = anomalies.map((a) => a.code)
      expect(codes).toContain('METADATA_NOT_IN_FILES')
      const a = anomalies.find((x) => x.code === 'METADATA_NOT_IN_FILES')
      expect(a?.subject).toBe('nonexistent_doc.md')
    })
  })

  describe('FILE_NOT_IN_METADATA', () => {
    beforeAll(async () => {
      await Bun.write(GHOST_FILE, '# Ghost file\nThis file has no metadata entry.')
    })

    afterAll(async () => {
      await Bun.file(GHOST_FILE)
        .delete()
        .catch(() => {})
    })

    it('should emit anomaly for disk file not referenced in metadata', async () => {
      // Pass empty metadata so the ghost file is definitely not referenced
      const { anomalies } = await ingest_files([])
      const fnim = anomalies.filter((a) => a.code === 'FILE_NOT_IN_METADATA')
      const subjects = fnim.map((a) => a.subject)
      expect(subjects).toContain('_test_ghost_file_for_ingest.md')
    })
  })

  describe('PROFILE_NOT_IN_METADATA', () => {
    it('should emit anomaly for proprietary configs not used in metadata', async () => {
      // demo_team has knowledge.proprietary = true → should appear
      const { anomalies } = await ingest_files([])
      const profiles = anomalies
        .filter((a) => a.code === 'PROFILE_NOT_IN_METADATA')
        .map((a) => a.subject)
      expect(profiles).toContain('demo')
    })

    it('should NOT emit anomaly for non-proprietary configs not used in metadata', async () => {
      // testing_purpose_1 has knowledge.proprietary = false → should NOT appear
      const { anomalies } = await ingest_files([])
      const profiles = anomalies
        .filter((a) => a.code === 'PROFILE_NOT_IN_METADATA')
        .map((a) => a.subject)
      expect(profiles).not.toContain('testing_purpose_1')
    })
  })
})
