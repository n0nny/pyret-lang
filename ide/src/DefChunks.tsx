import React from 'react';
import { connect, ConnectedProps } from 'react-redux';
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from 'react-beautiful-dnd';
import { Action } from './action';
import {
  LintFailures,
  Chunk,
  State,
} from './state';
import DefChunk from './DefChunk';

type stateProps = {
  lintFailures: LintFailures,
  highlights: number[][],
  name: string,
  chunks: Chunk[],
  chunkIndexCounter: number
};

type dispatchProps = {
  handleChunkEdit: any,
  handleReorder: any,
};

function getStartLineForIndex(chunks : Chunk[], index : number) {
  if (index === 0) { return 0; }

  return chunks[index - 1].startLine + chunks[index - 1].text.split('\n').length;
}

function mapStateToProps(state: State): stateProps {
  const {
    lintFailures,
    definitionsHighlights,
    currentFile,
    chunks,
    TMPchunkIndexCounter,
  } = state;

  if (currentFile === undefined) {
    throw new Error('currentFile is undefined');
  }

  return {
    lintFailures,
    highlights: definitionsHighlights,
    name: currentFile,
    chunks,
    chunkIndexCounter: TMPchunkIndexCounter,
  };
}

function mapDispatchToProps(dispatch: (action: Action) => any): dispatchProps {
  return {
    handleChunkEdit(
      chunks: Chunk[],
      chunkIndexCounter: number,
      index: number,
      text: string,
      shouldCreateNewChunk: boolean,
    ) {
      let newChunks : Chunk[];
      if (index === chunks.length) {
        const id = String(chunkIndexCounter);
        dispatch({ type: 'setChunkIndexCounter', chunkIndexCounter: chunkIndexCounter + 1 });
        newChunks = chunks.concat([{
          text,
          id,
          startLine: getStartLineForIndex(chunks, chunks.length),
        }]);
      } else {
        newChunks = chunks.map((p, ix) => {
          if (ix === index) { return { text, id: p.id, startLine: p.startLine }; }
          return p;
        });
        if (shouldCreateNewChunk) {
          newChunks.splice(index + 1, 0, {
            text: '',
            id: String(index + 1),
            startLine: getStartLineForIndex(newChunks, index) + 1,
          });
          for (let i = index + 1; i < newChunks.length; i += 1) {
            newChunks[i].id = String(i + 1);
          }
        }
        for (let i = index + 1; i < newChunks.length; i += 1) {
          newChunks[i].startLine = getStartLineForIndex(newChunks, i);
        }
      }
      dispatch({ type: 'setChunks', chunks: newChunks });
      dispatch({ type: 'updateChunkContents', index, contents: text });
    },
    handleReorder(
      result: DropResult,
      chunks: Chunk[],
    ) {
      // Great examples! https://codesandbox.io/s/k260nyxq9v
      const reorder = (innerChunks: Chunk[], start: number, end: number) => {
        const newResult = Array.from(innerChunks);
        const [removed] = newResult.splice(start, 1);
        newResult.splice(end, 0, removed);
        return newResult;
      };
      if (result.destination === undefined) { return; }

      const newChunks = reorder(chunks, result.source.index, result.destination.index);

      for (let i = 0; i < newChunks.length; i += 1) {
        newChunks[i].startLine = getStartLineForIndex(newChunks, i);
      }

      console.log('newChunks', newChunks);

      dispatch({ type: 'setChunks', chunks: newChunks });
      const firstAffectedChunk = Math.min(result.source.index, result.destination.index);
      dispatch({
        type: 'updateChunkContents',
        index: firstAffectedChunk,
        contents: newChunks[firstAffectedChunk].text,
      });
    },
  };
}

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;
type DefChunksProps = PropsFromRedux & dispatchProps & stateProps;

function DefChunks({
  handleChunkEdit, handleReorder, chunks, chunkIndexCounter, name, lintFailures, highlights,
}: DefChunksProps) {
  const onChunkEdit = (index: number, text: string, shouldCreateNewChunk: boolean) => {
    handleChunkEdit(chunks, chunkIndexCounter, index, text, shouldCreateNewChunk);
  };
  const onDragEnd = (result: DropResult) => {
    if (result.destination !== null
        && result.source!.index !== result.destination!.index) {
      handleReorder(result, chunks);
    }
  };

  function setupChunk(chunk: Chunk, index: number) {
    const linesInChunk = chunk.text.split('\n').length;
    let chunkHighlights : number[][];
    const chunkName = `${name}_chunk_${chunk.id}`;
    let failures : string[] = [];
    if (chunkName in lintFailures) {
      failures = lintFailures[chunkName].errors;
    }
    if (highlights.length > 0) {
      chunkHighlights = highlights.filter(
        (h) => h[0] > chunk.startLine && h[0] <= chunk.startLine + linesInChunk,
      );
    } else {
      chunkHighlights = [];
    }
    const isLast = index === chunks.length;
    return (
      <Draggable key={chunk.id} draggableId={chunk.id} index={index}>
        {(draggableProvided) => (
          <div
            ref={draggableProvided.innerRef}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...draggableProvided.draggableProps}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
              }}
            >
              <div
              // eslint-disable-next-line react/jsx-props-no-spreading
                {...draggableProvided.dragHandleProps}
                style={{
                  minWidth: '1.5em',
                  height: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderLeft: '1px solid lightgray',
                  background: 'lightgray',
                  borderRadius: '75% 0% 0% 75%',
                  marginLeft: '0.5em',
                }}
              >
                ::
              </div>
              <DefChunk
                name={chunkName}
                isLast={isLast}
                failures={failures}
                highlights={chunkHighlights}
                startLine={chunk.startLine}
                key={chunk.id}
                index={index}
                chunk={chunk.text}
                onEdit={onChunkEdit}
              />
            </div>
          </div>
        )}
      </Draggable>
    );
  }

  const allChunks = chunks.map(setupChunk);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {allChunks}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default connector(DefChunks);
