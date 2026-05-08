import * as React from "react"

import { cn } from "@/lib/utils"

interface TabsProps extends React.ComponentProps<"div"> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider")
  }
  return context
}

function Tabs({ className, value: controlledValue, defaultValue = "", onValueChange, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)

  const value = controlledValue ?? internalValue
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!controlledValue) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [controlledValue, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.ComponentProps<"div"> {
  value?: string
}

function TabsList({ className, value: controlledValue, ...props }: TabsListProps) {
  const { value: contextValue, onValueChange } = useTabsContext()

  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground gap-1",
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ComponentProps<"button"> {
  value: string
}

function TabsTrigger({ className, value: triggerValue, ...props }: TabsTriggerProps) {
  const { value: contextValue, onValueChange } = useTabsContext()
  const isActive = contextValue === triggerValue

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`panel-${triggerValue}`}
      id={`tab-${triggerValue}`}
      data-state={isActive ? "active" : "inactive"}
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={() => onValueChange(triggerValue)}
      {...props}
    />
  )
}

interface TabsContentProps extends React.ComponentProps<"div"> {
  value: string
}

function TabsContent({ className, value: contentValue, ...props }: TabsContentProps) {
  const { value: contextValue } = useTabsContext()
  const isActive = contextValue === contentValue

  if (!isActive) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${contentValue}`}
      aria-labelledby={`tab-${contentValue}`}
      data-state={isActive ? "active" : "inactive"}
      data-slot="tabs-content"
      tabIndex={0}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }