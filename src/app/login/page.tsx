"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/contexts/locale-context";

export default function LoginPage() {
  const { dict } = useLocale();
  const t = dict.login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");

  const handleSignIn = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/account";
      } else {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        if (data.message?.toLowerCase().includes("verify")) {
          setMessage(t.emailNotVerified);
        } else {
          setMessage(t.signInFailed);
        }
        setMessageType("error");
      }
    } catch {
      setMessage(t.networkError);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (res.ok) {
        setMessage(t.verifyEmailSent);
        setMessageType("info");
      } else {
        setMessage(t.signUpFailed);
        setMessageType("error");
      }
    } catch {
      setMessage(t.networkError);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="panel">
        <div className="panel-header">{t.title}</div>
        <div className="panel-body">
          <p className="text-[11px] text-muted-foreground mb-4">{t.subtitle}</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="signin" className="text-xs">
                {t.signIn}
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-xs">
                {t.signUp}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="email" className="text-xs">
                  {t.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="h-8 text-xs mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs">
                  {t.password}
                </Label>
                <Input
                  id="password"
                  type="password"
                  className="h-8 text-xs mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full h-8 text-xs" onClick={handleSignIn} disabled={loading}>
                {t.signIn}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 mt-4">
              <div>
                <Label htmlFor="name" className="text-xs">
                  {t.name}
                </Label>
                <Input
                  id="name"
                  className="h-8 text-xs mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-email" className="text-xs">
                  {t.email}
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  className="h-8 text-xs mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signup-password" className="text-xs">
                  {t.password}
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  className="h-8 text-xs mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full h-8 text-xs" onClick={handleSignUp} disabled={loading}>
                {t.signUp}
              </Button>
            </TabsContent>
          </Tabs>
          {message && (
            <p
              className={`text-xs mt-4 text-center ${
                messageType === "error" ? "text-destructive" : "text-primary"
              }`}
            >
              {message}
            </p>
          )}
          {messageType === "info" && message === t.verifyEmailSent && (
            <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-xs" asChild>
              <Link href="/pricing">{dict.paywall.upgrade}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
