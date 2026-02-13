interface Segment {
    value: number;
    color: string;
}

interface ProgressBarProps {
    segments: Segment[];
    height?: number;
}

export function ProgressBar({ segments, height = 8 }: ProgressBarProps) {
    const total = segments.reduce((sum, seg) => sum + seg.value, 0);
    if (total === 0) return null;

    return (
        <div
            class="w-full flex rounded-full overflow-hidden"
            style={{ height: `${height}px` }}
        >
            {segments.map((segment, i) => {
                const width = (segment.value / total) * 100;
                if (width === 0) return null;
                return (
                    <div
                        key={i}
                        class="transition-all duration-500"
                        style={{
                            width: `${width}%`,
                            backgroundColor: segment.color
                        }}
                    />
                );
            })}
        </div>
    );
}
