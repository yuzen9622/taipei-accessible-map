import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function Loading() {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
          <CardTitle>載入中</CardTitle>
          <CardDescription>請稍候，正在準備內容…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto mt-2 h-2 w-40 rounded-full bg-muted animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
