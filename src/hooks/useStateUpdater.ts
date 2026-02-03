import { mergeWith } from 'lodash';

type StateUpdater<T> = {
  (updates: DeepPartial<T> | ((prev: T) => T)): Promise<T>;
  sync: (updates: DeepPartial<T> | ((prev: T) => T)) => void;
};

export function useStateUpdater<T extends object>(initialState: T): [T, StateUpdater<T>] {
  const [state, setState] = useState<T>(initialState);

  const applyUpdate = (prev: T, updates: DeepPartial<T> | ((prev: T) => T)): T => {
    if (typeof updates === 'function') {
      return updates(prev);
    }

    return mergeWith({}, prev, updates, (objValue, srcValue) => {
      if (Array.isArray(srcValue)) return srcValue;
    }) as T;
  };

  // 1️ Create a mutable function variable
  const updateState = ((updates) => {
    return new Promise<T>((resolve) => {
      setState((prev) => {
        const next = applyUpdate(prev, updates);
        resolve(next);
        return next;
      });
    });
  }) as StateUpdater<T>;

  // 2️ Attach sync BEFORE returning
  updateState.sync = (updates) => {
    setState((prev) => applyUpdate(prev, updates));
  };

  return [state, updateState];
}
