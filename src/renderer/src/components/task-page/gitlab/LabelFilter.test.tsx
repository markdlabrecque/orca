// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TaskPageGitLabLabelFilter } from './LabelFilter'

afterEach(cleanup)

describe('GitLab task label filter', () => {
  it('shows label loading failures instead of an empty project', async () => {
    const user = userEvent.setup()
    render(<TaskPageGitLabLabelFilter labels={[]} loadFailed selected={[]} onChange={vi.fn()} />)
    await user.click(screen.getByRole('combobox', { name: /labels/i }))
    expect(screen.getByText('Could not load labels. Try Refresh.')).toBeDefined()
  })

  it('reports partial loading failures without hiding available labels', async () => {
    const user = userEvent.setup()
    render(
      <TaskPageGitLabLabelFilter labels={['bug']} loadFailed selected={[]} onChange={vi.fn()} />
    )
    await user.click(screen.getByRole('combobox', { name: /labels/i }))
    expect(screen.getByText('Some labels could not load. Try Refresh.')).toBeDefined()
    expect(screen.getByText('bug')).toBeDefined()
  })

  it('searches labels, keeps multiple selections, and clears them together', async () => {
    const onChange = vi.fn()
    function Harness() {
      const [selected, setSelected] = useState<string[]>([])
      return (
        <TaskPageGitLabLabelFilter
          labels={['bug', 'frontend', 'needs review']}
          selected={selected}
          onChange={(next) => {
            setSelected(next)
            onChange(next)
          }}
        />
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('combobox', { name: /labels/i }))
    await user.type(screen.getByPlaceholderText('Search labels...'), 'needs')
    expect(screen.getByText('needs review')).toBeDefined()
    expect(screen.queryByText('frontend')).toBeNull()
    await user.click(screen.getByText('needs review'))
    expect(onChange).toHaveBeenLastCalledWith(['needs review'])
    await user.clear(screen.getByPlaceholderText('Search labels...'))
    await user.click(screen.getByText('bug'))
    expect(onChange).toHaveBeenLastCalledWith(['needs review', 'bug'])
    await user.click(screen.getByText('All labels'))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
