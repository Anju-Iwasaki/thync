
import { Suspense } from "react";
import RoomLivePreview from "../../../components/room/RoomLivePreview";

export default function RoomUIPreviewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    return (
        <Suspense fallback={<p>ルームを読み込み中...</p>}>
            <RoomById params={params} />
        </Suspense>
    );
}

async function RoomById({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return <RoomLivePreview roomId={id} />;
}
