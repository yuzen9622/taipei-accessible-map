"use client";

import { Home, SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <SearchX className="h-7 w-7 text-muted-foreground" />
          </div>
          <CardTitle>找不到頁面</CardTitle>
          <CardDescription>
            您要找的頁面不存在、已移動或暫時不可用。
          </CardDescription>
        </CardHeader>

        <CardContent className="text-sm text-muted-foreground">
          錯誤代碼：404
        </CardContent>

        <CardFooter className="flex gap-2 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              回首頁
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
