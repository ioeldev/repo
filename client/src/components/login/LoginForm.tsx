import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/hooks/useAuth";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "../ui/dialog";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { mutate: login, isPending, error } = useLogin();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            return;
        }

        login({ email, password });
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="border-none">
                <CardHeader>
                    <CardTitle className="text-2xl">Connectez vous</CardTitle>
                    <CardDescription>Entrez vos identifiants afin de vous connecter à votre compte.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="exemple@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                                    <Dialog>
                                        <DialogTrigger className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                                            Mot de passe oublié?
                                        </DialogTrigger>
                                        <DialogContent className="!max-w-sm">
                                            <DialogHeader>Mot de passe oublié?</DialogHeader>
                                            <DialogDescription>
                                                Veuillez prendre contact avec votre conseiller afin de réinitialiser
                                                votre mot de passe.
                                            </DialogDescription>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant={"secondary"}>J'ai compris</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isPending}
                                />
                            </Field>
                            {error && (
                                <div className="text-sm text-red-500">
                                    {error instanceof Error ? error.message : "La connexion a échoué"}
                                </div>
                            )}
                            <Field>
                                <Button type="submit" disabled={isPending || !email || !password}>
                                    {isPending ? "Connexion..." : "Se connecter"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
