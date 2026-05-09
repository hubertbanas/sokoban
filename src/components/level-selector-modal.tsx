import type { LevelPack } from "../hooks/levels";
import { Modal } from "./modal";
import style from "./sokoban.module.css";

type LevelSelectorModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    levelPacks: LevelPack[];
    onSelectLevel: (levelId: string) => void;
};

function LevelSelectorModal({
    open,
    onOpenChange,
    levelPacks,
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
                    const currentPackMeta = `${pack.levels.length} levels available`;

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
                        </section>
                    );
                })}
            </div>
        </Modal>
    );
}

export { LevelSelectorModal };