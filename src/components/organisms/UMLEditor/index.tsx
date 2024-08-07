import Draggable from "react-draggable";
import Legend from "@/components/atoms/Legend";
import { calculatePath } from "@/shared/canvas.utils";
import {
  triangleIcon,
  rectangleIcon,
  circleIcon,
  hexagonIcon,
} from "@/shared/svgIcons";
import {
  Block,
  BlockType,
  Connection,
  EditorData,
  EditorTypeEnum,
  MarkerType,
  Row,
  UMLEditorProps,
} from "./types";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Aside } from "@ginger-society/ginger-ui";
import { NEW_BLOCK_ID_PREFIX } from "./constants";
import { ColumnType } from "../ColumnEditor/types";
import { FaPencilAlt } from "react-icons/fa";

const UMLEditor = ({
  setBlocks,
  setConnections,
  blocks,
  connections,
  legendConfigs,
  RowEditor,
  BlockEditor,
  setEditorData,
  HeadingRenderer = ({ blockData }) => {
    return blockData.id;
  },
  RowRenderer = ({ rowData }) => {
    return rowData.id;
  },
  updateConnections,
  createNewBlock,
  EnumRowRenderer = ({ blockData }) => {
    return blockData.id;
  },
}: UMLEditorProps) => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [editorType, setEditorType] = useState<EditorTypeEnum>();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const toggleSlider = (
    type: EditorTypeEnum,
    blockId: string,
    rowIndex?: number
  ) => {
    setIsSliderOpen((isOpen) => !isOpen);
    setEditorType(type);
    setEditorData({ rowIndex, blockId });
  };

  const closeSlider = () => {
    setIsSliderOpen(false);

    setBlocks((v) => {
      const keysToDelete: string[] = [];
      const updatedBlocks = Object.keys(v).reduce(
        (accum: { [k: string]: Block }, key) => {
          if (v[key].id !== key) {
            accum[v[key].id] = v[key];
            keysToDelete.push(key);
          } else {
            accum[key] = v[key];
          }
          return accum;
        },
        {}
      );

      keysToDelete.forEach((k) => {
        delete updatedBlocks[k];
      });
      return updatedBlocks;
    });

    updateConnections();
  };

  const svgRef = React.createRef<SVGSVGElement>();
  const [paths, setPaths] = useState<
    { path: string; midX: number; midY: number }[]
  >([]);

  const handleDrag = useCallback(() => {
    const newPaths = connections.map(
      ({ block1Id, fromRow, block2Id, toRow }) => {
        const rect1 = blocks[block1Id]?.ref.current?.getBoundingClientRect();
        const rect2 = blocks[block2Id]?.ref.current?.getBoundingClientRect();
        const { d, midX, midY } = calculatePath(
          rect1,
          rect2,
          fromRow,
          toRow,
          blocks[block1Id]?.rows.length || 0,
          blocks[block2Id]?.rows.length || 0
        );
        return { path: d, midX, midY };
      }
    );

    setPaths(newPaths);
  }, [blocks, connections]);

  useEffect(() => {
    handleDrag();
  }, [connections, handleDrag]);

  const handleBlockDrag = (id: string, e: any, data: any) => {
    setBlocks((prevBlocks) => ({
      ...prevBlocks,
      [id]: {
        ...prevBlocks[id],
        position: { top: data.y, left: data.x },
      },
    }));
    handleDrag(); // Update paths after dragging
  };

  const handleAddBlock = (type: BlockType) => {
    if (!contextMenu) {
      return;
    }

    setBlocks((v) => {
      const id = `${NEW_BLOCK_ID_PREFIX}-${type}`;
      return {
        ...v,
        [id]: createNewBlock(type, contextMenu.x, contextMenu.y, id),
      };
    });
    closeContextMenu();
  };

  const addNewRow = (id: string) => {
    setBlocks((prevBlocks) => ({
      ...prevBlocks,
      [id]: {
        ...prevBlocks[id],
        rows: [...prevBlocks[id].rows, { id: "new-row", data: {} }],
      },
    }));
    handleDrag(); // Update paths after dragging
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX + window.scrollX,
      y: e.clientY + window.scrollY - 50,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        closeContextMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="canvas-container" onContextMenu={handleContextMenu}>
        {Object.values(blocks).map((block) => (
          <Draggable
            key={block.id}
            onDrag={(e, data) => handleBlockDrag(block.id, e, data)}
            handle=".handle"
            position={{ x: block.position.left, y: block.position.top }}
          >
            <div className="card block-card" ref={block.ref}>
              {/* Header row */}
              <div
                className={`${
                  block.type === BlockType.Enum
                    ? "options-header"
                    : "table-header"
                } block-header handle`}
              >
                <HeadingRenderer blockData={block} />
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSlider(EditorTypeEnum.BLOCK, block.id);
                  }}
                >
                  <FaPencilAlt />
                </span>
              </div>
              {/* Render dynamic number of rows */}
              {block.rows.map((row, index) => (
                <div
                  onClick={() =>
                    toggleSlider(EditorTypeEnum.ROW, block.id, index)
                  }
                  key={index}
                  className={`row-content ${
                    row.data.type !== ColumnType.PK ? "hoverable" : ""
                  }`}
                >
                  <RowRenderer rowData={row} />
                </div>
              ))}
              {block.type === BlockType.Table && (
                <div
                  onClick={() => {
                    addNewRow(block.id);
                  }}
                  className="row-content hoverable"
                >
                  Add new row
                </div>
              )}
              {block.type === BlockType.Enum && (
                <div
                  onClick={() => toggleSlider(EditorTypeEnum.BLOCK, block.id)}
                  className="row-content"
                >
                  <EnumRowRenderer blockData={block} />
                </div>
              )}
            </div>
          </Draggable>
        ))}
        {/* Render connections */}
        <svg ref={svgRef} className="svg-container">
          {paths.map(({ path, midX, midY }, index) => (
            <g key={index}>
              <path d={path} stroke="var(--primary-color)" fill="transparent" />
              {connections[index]?.marker && (
                <g transform={`translate(${midX - 13}, ${midY})`}>
                  {(() => {
                    const marker = connections[index].marker;
                    if (!marker) {
                      return null;
                    }
                    const color = legendConfigs[marker]?.color || "#000";

                    switch (connections[index].marker) {
                      case MarkerType.Triangle:
                        return triangleIcon(color);
                      case MarkerType.Rectangle:
                        return rectangleIcon(color);
                      case MarkerType.Circle:
                        return circleIcon(color);
                      case MarkerType.Hexagon:
                        return hexagonIcon(color);
                      default:
                        return null;
                    }
                  })()}
                  {connections[index].label && (
                    <text
                      x="10"
                      y="-10"
                      fontSize="15"
                      textAnchor="middle"
                      fill="var(--primary-color)"
                    >
                      {connections[index].label}
                    </text>
                  )}
                </g>
              )}
            </g>
          ))}
        </svg>
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button onClick={() => handleAddBlock(BlockType.Table)}>
              Add Block
            </button>
            <button onClick={() => handleAddBlock(BlockType.Enum)}>
              Add Options
            </button>
          </div>
        )}
      </div>
      <Aside isOpen={isSliderOpen} onClose={closeSlider}>
        {editorType === EditorTypeEnum.ROW && <RowEditor close={closeSlider} />}
        {editorType === EditorTypeEnum.BLOCK && (
          <BlockEditor close={closeSlider} />
        )}
      </Aside>
      <Legend items={legendConfigs} />
    </>
  );
};

export default UMLEditor;
