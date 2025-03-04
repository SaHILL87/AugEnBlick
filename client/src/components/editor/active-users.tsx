import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Users } from "lucide-react";

interface User {
  userName: string;
  color: string;
}

interface ActiveUsersDrawerProps {
  activeUsers: User[];
  showActiveUsers: boolean;
  setShowActiveUsers: (show: boolean) => void;
}

export function ActiveUsersDrawer({
  activeUsers,
  showActiveUsers,
  setShowActiveUsers,
}: ActiveUsersDrawerProps) {
  return (
    <Drawer open={showActiveUsers} onOpenChange={setShowActiveUsers}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="icon" className="fixed left-4 top-4 z-10">
          <Users className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent  className="w-[300px] sm:w-[350px]">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-medium text-purple-800">Active Users</DrawerTitle>
            <DrawerDescription>See who's currently online</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <ul className="space-y-3">
              {activeUsers.map((user, index) => (
                <li key={index} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  ></span>
                  <span className="text-sm font-medium">{user.userName}</span>
                </li>
              ))}
            </ul>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}