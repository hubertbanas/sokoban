import type { LevelPack } from "../hooks/levels";
import { Modal } from "./modal";
import style from "./sokoban.module.css";

type LevelSelectorModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    levelPacks: LevelPack[];
    currentLevelId: string;
    onSelectLevel: (levelId: string) => void;
};

function LevelSelectorModal({
    open,
    onOpenChange,
    levelPacks,
    currentLevelId,
    onSelectLevel,
}: LevelSelectorModalProps) {
    if (!open) {
        return null;
    }

    return (
        <Modal
            title="Level Packs"
            ariaLabel="Level pack selector"
            onClose={() => onOpenChange(false)}
            autoFocusCloseButton
        >
            <div className={style.levelSelector}>
                {levelPacks.map((pack) => {
                    const currentPackLevelIndex = pack.levels.findIndex(
                        (packLevel) => packLevel.levelId === currentLevelId
                    );
                    const currentPackMeta =
                        currentPackLevelIndex >= 0
                            ? `Level ${currentPackLevelIndex + 1} / ${pack.levels.length}`
                            : `${pack.levels.length} levels`;

                    return (
                        <section className={style.levelSelectorPack} key={pack.packId}>
                            <div className={style.levelSelectorPackHeader}>
                                <div>
                                    <h3 className={style.levelSelectorPackTitle}>{pack.title}</h3>
                                    <p className={style.levelSelectorPackMeta}>{currentPackMeta}</p>
                                </div>

                                <button
                                    type="button"
                                    className={style.levelNavButton}
                                    onClick={() => {
                                        if (!pack.levels.length) {
                                            return;
                                        }
                                        onSelectLevel(pack.levels[0].levelId);
                                    }}
                                    disabled={!pack.levels.length}
                                >
                                    Play Pack
                                </button>
                            </div>

                            {pack.description && (
                                <p className={style.levelSelectorPackDescription}>{pack.description}</p>
                            )}

                            <div className={style.levelSelectorLevelGrid}>
                                {pack.levels.map((packLevel, index) => {
                                    const isCurrentLevel = packLevel.levelId === currentLevelId;
                                    return (
                                        <button
                                            type="button"
                                            key={packLevel.levelId}
                                            className={`${style.levelSelectorLevelButton} ${isCurrentLevel ? style.levelSelectorLevelButtonActive : ""}`}
                                            onClick={() => onSelectLevel(packLevel.levelId)}
                                            aria-current={isCurrentLevel ? "true" : undefined}
                                            aria-label={`Open ${pack.title} level ${index + 1}: ${packLevel.name}`}
                                        >
                                            <span className={style.levelSelectorLevelIndex}>{index + 1}</span>
                                            <span className={style.levelSelectorLevelName}>{packLevel.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </Modal>
    );
}

export { LevelSelectorModal };