import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { proxy, snapshot, useSnapshot } from 'valtio'
import { proxySet } from 'valtio/utils'

// used to initialize proxySet during tests
const initialValues = [
  {
    name: 'array',
    value: ['lorem', false, 1],
  },
  {
    name: 'nested array',
    value: [
      [1, 2, 3],
      [1, 2],
      [51, 2, 3],
    ],
  },
  {
    name: 'Map',
    value: new Map([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]),
  },
  {
    name: 'Set',
    value: new Set([
      ['key1', 'value1'],
      ['key2', 'value2'],
    ]),
  },
  {
    name: 'string value',
    value: 'hello',
  },
  {
    name: 'nested Set',
    value: new Set([
      new Set([1, 2, 3]),
      new Set([1, 2]),
      new Set(['x', 'y', 'z']),
    ]),
  },
  {
    name: 'proxySet',
    value: proxySet([1, {}, true]),
  },
  {
    name: 'array of proxySet',
    value: [proxySet([1, 2, 3]), proxySet([1, 2]), proxySet(['x', 'y', 'z'])],
  },
  {
    name: 'list of objects',
    value: [
      { id: Symbol(), field: 'field', bool: true, null: null },
      { id: Symbol(), field: 'field1', bool: false, null: null },
      { id: Symbol(), field: 'field3', bool: true, null: null },
    ],
  },
]

// used to test various input types
const inputValues = [
  {
    name: 'array',
    value: [1, 'hello'],
  },
  {
    name: 'nested array',
    value: [[1, 'hello']],
  },
  {
    name: 'Map',
    value: new Map<any, any>([
      ['key1', 'value1'],
      [{}, 'value2'],
    ]),
  },
  {
    name: 'boolean',
    value: false,
  },
  {
    name: 'number',
    value: 123,
  },
  {
    name: 'string',
    value: 'hello',
  },
  {
    name: 'Set',
    value: new Set([1, 2, 3]),
  },
  {
    name: 'proxySet',
    value: proxySet([1, {}, null, 'xyz', Symbol()]),
  },
  {
    name: 'object',
    value: { id: Symbol(), field: 'field', bool: true, null: null },
  },
]

describe('features parity with native Set', () => {
  initialValues.forEach(({ name, value }) => {
    it(`support Set operations on ${name}`, () => {
      const set = proxySet<unknown>(value)
      const nativeSet = new Set<unknown>(value)

      // check for Symbol.toStringTag / toString
      expect(`${set}`).toBe(`${nativeSet}`)

      const expectOutputToMatch = () => {
        expect(set.size).toStrictEqual(nativeSet.size)
        expect(Array.from(set.values())).toStrictEqual(
          Array.from(nativeSet.values()),
        )
        expect(Array.from(set.keys())).toStrictEqual(
          Array.from(nativeSet.keys()),
        )
        expect(Array.from(set.entries())).toStrictEqual(
          Array.from(nativeSet.entries()),
        )
        expect(JSON.stringify(set)).toStrictEqual(JSON.stringify(nativeSet))

        JSON.stringify(set, (_, setV) => {
          JSON.stringify(nativeSet, (_, nativeSetV) => {
            expect(setV).toStrictEqual(nativeSetV)
          })
        })

        // cover loops
        const handleForEach = vi.fn()
        const handleForOf = vi.fn()

        set.forEach(handleForEach)
        expect(handleForEach).toHaveBeenCalledTimes(set.size)

        for (const _ of set) {
          handleForOf()
        }

        expect(handleForOf).toHaveBeenCalledTimes(set.size)
      }

      expectOutputToMatch()

      const [valueToDeleteFromSet] = set
      const [valueToDeleteFromNativeSet] = nativeSet

      expect(set.delete(valueToDeleteFromSet)).toBe(
        nativeSet.delete(valueToDeleteFromNativeSet),
      )

      expectOutputToMatch()

      set.add('newValue')
      nativeSet.add('newValue')
      expectOutputToMatch()

      set.clear()
      nativeSet.clear()
      expectOutputToMatch()
    })
  })

  inputValues.forEach(({ value, name }) => {
    it(`prevent adding duplicate for type ${name}`, () => {
      const set = proxySet<unknown>([value])

      expect(set.size).toBe(1)

      set.add(value)
      expect(set.size).toBe(1)
    })
  })
})

describe('unsupported initial values', () => {
  const unsupportedInputTestCases = [
    {
      name: 'boolean',
      value: true,
    },
    {
      name: 'number',
      value: 123,
    },
    {
      name: 'symbol',
      value: Symbol(),
    },
  ]

  unsupportedInputTestCases.forEach(({ name, value }) => {
    it(`throw type error when using ${name} as initial value`, () => {
      expect(() => proxySet(value as any)).toThrow(/not iterable/)
    })
  })
})

describe('clear set', () => {
  initialValues.forEach(({ name, value }) => {
    it(`clear proxySet of ${name}`, async () => {
      const state = proxy({
        set: proxySet<unknown>(value),
      })

      const TestComponent = () => {
        const snap = useSnapshot(state)

        return (
          <>
            <div>size: {snap.set.size}</div>
            <button onClick={() => state.set.clear()}>button</button>
          </>
        )
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      )

      screen.getByText(`size: ${state.set.size}`)

      fireEvent.click(screen.getByText('button'))
      await waitFor(() => {
        screen.getByText('size: 0')
      })
    })
  })
})

describe('add value', () => {
  inputValues.forEach(({ name, value }) => {
    it(`update size when adding ${name}`, async () => {
      const state = proxy({
        set: proxySet(),
      })

      const TestComponent = () => {
        const snap = useSnapshot(state)

        return (
          <>
            <div>size: {snap.set.size}</div>
            <button onClick={() => state.set.add(value)}>button</button>
          </>
        )
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      )

      screen.getByText('size: 0')
      fireEvent.click(screen.getByText('button'))

      await waitFor(() => {
        screen.getByText('size: 1')
      })
    })
  })
})

describe('delete', () => {
  initialValues.forEach(({ name, value }) => {
    it(`support delete on ${name}`, async () => {
      const state = proxy({
        set: proxySet<unknown>(value),
      })

      // pick a random value from the set
      const valueToDelete = Array.from(state.set)[
        Math.floor(Math.random() * state.set.size)
      ]

      const TestComponent = () => {
        const snap = useSnapshot(state)

        return (
          <>
            <div>size: {snap.set.size}</div>
            <button onClick={() => state.set.delete(valueToDelete)}>
              button
            </button>
          </>
        )
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      )

      screen.getByText(`size: ${state.set.size}`)

      const expectedSizeAfterDelete =
        state.set.size > 1 ? state.set.size - 1 : 0

      fireEvent.click(screen.getByText('button'))
      await waitFor(() => {
        screen.getByText(`size: ${expectedSizeAfterDelete}`)
      })
    })
  })

  inputValues.forEach(({ name, value }) => {
    it(`return false when trying to delete non-existing value of type ${name}`, () => {
      const set = proxySet()

      expect(set.delete(value)).toBe(false)
    })
  })
})

describe('proxySet internal', () => {
  it('should be sealed', () => {
    expect(Object.isSealed(proxySet())).toBe(true)
  })

  it('should list only enumerable properties', () => {
    const notEnumerableProps = ['data', 'size', 'toJSON']
    expect(
      Object.keys(proxySet()).some((k) => notEnumerableProps.includes(k)),
    ).toBe(false)
  })
})

describe('snapshot behavior', () => {
  it('should error when trying to mutate a snapshot', () => {
    const state = proxySet()
    const snap = snapshot(state)

    expect(() => snap.add('foo')).toThrow(
      'Cannot perform mutations on a snapshot',
    )
    // @ts-expect-error - snapshot should not be able to mutate
    expect(() => snap.delete('foo')).toThrow(
      'Cannot perform mutations on a snapshot',
    )
    // @ts-expect-error - snapshot should not be able to mutate
    expect(() => snap.clear()).toThrow('Cannot perform mutations on a snapshot')
  })

  it('should work with deleting a key', async () => {
    const state = proxySet(['val1', 'val2'])
    const snap1 = snapshot(state)
    expect(snap1.has('val1')).toBe(true)
    expect(snap1.has('val2')).toBe(true)
    state.delete('val1')
    const snap2 = snapshot(state)
    expect(snap1.has('val1')).toBe(true)
    expect(snap1.has('val2')).toBe(true)
    expect(snap2.has('val1')).toBe(false)
    expect(snap2.has('val2')).toBe(true)
  })
})

describe('ui updates - useSnapshot', async () => {
  it('should update ui when calling has before and after setting anddeleting a value', async () => {
    const state = proxySet()
    const TestComponent = () => {
      const snap = useSnapshot(state)

      return (
        <>
          <p>has value: {`${snap.has('value')}`}</p>
          <button
            onClick={() => {
              state.add('value')
              state.add('value2')
            }}
          >
            add value
          </button>
          <button onClick={() => state.delete('value')}>delete value</button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => {
      screen.getByText('has value: false')
    })

    fireEvent.click(screen.getByText('add value'))
    await waitFor(() => {
      screen.getByText('has value: true')
    })

    fireEvent.click(screen.getByText('delete value'))
    await waitFor(() => {
      screen.getByText('has value: false')
    })
  })

  it('should update ui when calling has before and after settiing and deleting multiple values', async () => {
    const state = proxySet()
    const TestComponent = () => {
      const snap = useSnapshot(state)

      return (
        <>
          <p>has value: {`${snap.has('value')}`}</p>
          <p>has value2: {`${snap.has('value2')}`}</p>
          <button
            onClick={() => {
              state.add('value')
              state.add('value2')
            }}
          >
            add values
          </button>
          <button
            onClick={() => {
              state.delete('value')
              state.delete('value2')
            }}
          >
            delete values
          </button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })

    fireEvent.click(screen.getByText('add values'))
    await waitFor(() => {
      screen.getByText('has value: true')
      screen.getByText('has value2: true')
    })

    fireEvent.click(screen.getByText('delete values'))
    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })
  })

  it('should update ui when calling has before and after settiing multiple values and deleting a single one (first item)', async () => {
    const state = proxySet()
    const TestComponent = () => {
      const snap = useSnapshot(state)

      return (
        <>
          <p>has value: {`${snap.has('value')}`}</p>
          <p>has value2: {`${snap.has('value2')}`}</p>
          <button
            onClick={() => {
              state.add('value')
              state.add('value2')
            }}
          >
            add values
          </button>
          <button
            onClick={() => {
              state.delete('value')
            }}
          >
            delete values
          </button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })

    fireEvent.click(screen.getByText('add values'))
    await waitFor(() => {
      screen.getByText('has value: true')
      screen.getByText('has value2: true')
    })

    fireEvent.click(screen.getByText('delete values'))
    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: true')
    })
  })

  it('should update ui when calling has before and after settiing multiple values and deleting a single one (second item)', async () => {
    const state = proxySet()
    const TestComponent = () => {
      const snap = useSnapshot(state)

      return (
        <>
          <p>has value: {`${snap.has('value')}`}</p>
          <p>has value2: {`${snap.has('value2')}`}</p>
          <button
            onClick={() => {
              state.add('value')
              state.add('value2')
            }}
          >
            add values
          </button>
          <button
            onClick={() => {
              state.delete('value2')
            }}
          >
            delete values
          </button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })

    fireEvent.click(screen.getByText('add values'))
    await waitFor(() => {
      screen.getByText('has value: true')
      screen.getByText('has value2: true')
    })

    fireEvent.click(screen.getByText('delete values'))
    await waitFor(() => {
      screen.getByText('has value: true')
      screen.getByText('has value2: false')
    })
  })

  it('should update ui when clearing the set', async () => {
    const state = proxySet()
    const TestComponent = () => {
      const snap = useSnapshot(state)

      return (
        <>
          <p>has value: {`${snap.has('value')}`}</p>
          <p>has value2: {`${snap.has('value2')}`}</p>
          <button
            onClick={() => {
              state.add('value')
              state.add('value2')
            }}
          >
            add values
          </button>
          <button
            onClick={() => {
              state.clear()
            }}
          >
            clear set
          </button>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })

    fireEvent.click(screen.getByText('add values'))
    await waitFor(() => {
      screen.getByText('has value: true')
      screen.getByText('has value2: true')
    })

    fireEvent.click(screen.getByText('clear set'))
    await waitFor(() => {
      screen.getByText('has value: false')
      screen.getByText('has value2: false')
    })
  })

  it('should be reactive to changes when using values method', async () => {
    const state = proxySet<number>()

    const TestComponent = () => {
      const snap = useSnapshot(state)

      const addItem = () => {
        const item = 1
        state.add(item)
      }

      return (
        <>
          <button onClick={addItem}>Add Item</button>
          <ul>
            {Array.from(snap.values()).map((setItem) => (
              <li key={setItem}>{`${setItem}`}</li>
            ))}
          </ul>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    fireEvent.click(screen.getByText('Add Item'))

    expect(await screen.findByText('1')).toBeDefined()
  })

  it('should be reactive to changes when using keys method', async () => {
    const state = proxySet<number>()

    const TestComponent = () => {
      const snap = useSnapshot(state)

      const addItem = () => {
        const item = 1
        state.add(item)
      }

      return (
        <>
          <button onClick={addItem}>Add Item</button>
          <ul>
            {Array.from(snap.keys()).map((setKey) => (
              <li key={setKey}>{`item key: ${setKey}`}</li>
            ))}
          </ul>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    fireEvent.click(screen.getByText('Add Item'))
    expect(await screen.findByText('item key: 1')).toBeDefined()
  })

  it('should be reactive to changes when using entries method', async () => {
    const state = proxySet<number>()

    const TestComponent = () => {
      const snap = useSnapshot(state)

      const addItem = () => {
        const item = 1
        state.add(item)
      }

      return (
        <>
          <button onClick={addItem}>Add Item</button>
          <ul>
            {Array.from(snap.entries()).map(([setKey, setValue]) => (
              <li key={setValue}>{`key: ${setKey}; value: ${setValue}`}</li>
            ))}
          </ul>
        </>
      )
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    )

    fireEvent.click(screen.getByText('Add Item'))
    expect(await screen.findByText('key: 1; value: 1')).toBeDefined()
  })
})

describe('ui updates - useSnapshot - iterator methods', () => {
  const iteratorMethods = ['keys', 'values', 'entries'] as const
  iteratorMethods.forEach((iteratorMethod) => {
    it(`should be reactive to changes when using ${iteratorMethod} method`, async () => {
      interface MapItem {
        id: number
        name: string
      }
      const state = proxySet<MapItem>()

      const TestComponent = () => {
        const snap = useSnapshot(state)

        const addItem = (id: number) => {
          const item: MapItem = {
            id,
            name: `item ${id}`,
          }
          state.add(item)
        }

        const methods = {
          entries: Array.from(snap.entries()).map(([item]) => (
            <li
              key={item.id}
            >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
          )),
          values: Array.from(snap.values()).map((item) => (
            <li
              key={item.id}
            >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
          )),
          keys: Array.from(snap.keys()).map((item) => {
            return (
              <li
                key={item.id}
              >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
            )
          }),
        }

        return (
          <>
            <button onClick={() => addItem(1)}>Add</button>
            <ul>{methods[iteratorMethod]}</ul>
          </>
        )
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      )

      fireEvent.click(screen.getByText('Add'))
      await waitFor(() => {
        screen.getByText(`item.name: item 1; item.id: 1`)
      })
    })

    it(`should be reactive to changes when using ${iteratorMethod} method when setting multiple values`, async () => {
      interface MapItem {
        id: number
        name: string
      }
      const state = proxySet<MapItem>()

      const TestComponent = () => {
        const snap = useSnapshot(state)

        const addItem = (id: number) => {
          const item: MapItem = {
            id,
            name: `item ${id}`,
          }
          state.add(item)
        }

        return (
          <>
            <button
              onClick={() => {
                addItem(1)
                addItem(2)
              }}
            >
              Add
            </button>
            <ul>
              {iteratorMethod === 'entries'
                ? Array.from(snap[iteratorMethod]()).map(([item]) => (
                    <li
                      key={item.id}
                    >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
                  ))
                : iteratorMethod === 'values'
                  ? Array.from(snap[iteratorMethod]()).map((item) => (
                      <li
                        key={item.id}
                      >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
                    ))
                  : Array.from(snap[iteratorMethod]()).map((item) => {
                      return (
                        <li
                          key={item.id}
                        >{`item.name: ${item.name}; item.id: ${item.id}`}</li>
                      )
                    })}
            </ul>
          </>
        )
      }

      render(
        <StrictMode>
          <TestComponent />
        </StrictMode>,
      )

      fireEvent.click(screen.getByText('Add'))
      await waitFor(() => {
        screen.getByText(`item.name: item 1; item.id: 1`)
        screen.getByText(`item.name: item 2; item.id: 2`)
      })
    })
  })
})
