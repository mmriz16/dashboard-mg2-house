import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InputGroup } from "@/components/ui/InputGroup";

export default function LoginPage() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-4">
                <Badge text="default" style="default" />
                <Badge text="success" style="success" />
                <Badge text="warning" style="warning" />
                <Badge text="danger" style="danger" />
                <Badge text="info" style="info" />
            </div>
            <div className="flex flex-row gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="white">White</Button>
                <Button variant="disabled">Disabled</Button>
            </div>
        </div>
    )
}