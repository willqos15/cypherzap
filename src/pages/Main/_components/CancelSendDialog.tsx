import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#components/ui/alert-dialog";

import { Button } from "#components/ui/button";

type Props = {
  onConfirm: () => void;
};

export default function CancelSendDialog({ onConfirm }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button
          type="button"
          variant="delete"
          className="mt-5 w-full"
        >
          Cancelar envio
        </Button>}>
        
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-bold">
            Deseja cancelar o envio?
          </AlertDialogTitle>

          <AlertDialogDescription>

            O envio será encerrado e{" "}
            <strong>
              não será possível continuar de onde parou
            </strong>

          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>
            Continuar enviando
          </AlertDialogCancel>

          <AlertDialogAction onClick={onConfirm} variant="delete">
            Sim, cancelar envio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}