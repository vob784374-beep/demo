import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Permission } from "@/lib/api/permissions"

interface PermissionGroupProps {
  category: string
  permissions: Permission[]
  selectedNames: Set<string>
  onToggle: (name: string, checked: boolean) => void
}

export default function PermissionGroup({ 
  category, 
  permissions, 
  selectedNames,
  onToggle 
}: PermissionGroupProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{category}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permissions.map((permission) => {
            const name = permission.name
            const description = permission.description || ""
            const isChecked = selectedNames.has(name)

            return (
              <div key={permission.id} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50">
                <Checkbox
                  id={name}
                  checked={isChecked}
                  onCheckedChange={(checked) => onToggle(name, checked === true)}
                />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={name}
                    className="text-sm font-medium cursor-pointer"
                    title={name}
                  >
                    {name}
                  </Label>
                  {description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
