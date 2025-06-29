import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  Button,
  useDisclosure,
  Input,
} from "@heroui/react";
import { Download, ListStart } from "lucide-react";

export default function DrawerComponent() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <div>
      <p onClick={onOpen}>
        <ListStart className="text-white" />
      </p>
      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                Playlist Download
              </DrawerHeader>
              <DrawerBody>
                <Input placeholder="Enter Playlist URL" />
                <Button color="primary">Create</Button>
              </DrawerBody>
              <DrawerFooter>
                <Button
                  color="danger"
                  variant="bordered"
                  className="flex"
                  onPress={onClose}
                >
                  <Download /> Selective Download
                </Button>
                <Button
                  color="primary"
                  onPress={onClose}
                  className="flex"
                >
                  <Download />
                  Instantly Download
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
