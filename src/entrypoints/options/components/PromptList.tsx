import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import SortablePromptCard from './SortablePromptCard';

interface PromptListProps {
  prompts: PromptItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  searchTerm: string;
  allPromptsCount: number;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onTogglePinned?: (id: string, pinned: boolean) => void;
  selectedCategoryId?: string | null;
}

const PromptList = ({ prompts, onEdit, onDelete, onReorder, searchTerm, allPromptsCount, onToggleEnabled, onTogglePinned, selectedCategoryId }: PromptListProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Drag sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Load classification information
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesList = await getCategories();
        setCategories(categoriesList);

        // Create a classification mapping table
        const map: Record<string, Category> = {};
        categoriesList.forEach((category) => {
          map[category.id] = category;
        });
        setCategoriesMap(map);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

    loadCategories();
  }, []);

  // Drag and drop to start processing
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  //Drag and drop end processing
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.id) {
      onReorder(active.id as string, over.id as string);
    }

    setActiveId(null);
  };

  // Function to copy content of prompt word
  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      // Clear copy status after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      // You can add error messages here
    }
  };

  // Filter prompt words based on selected categories
  const filteredPrompts = selectedCategoryId ? prompts.filter((prompt) => prompt.categoryId === selectedCategoryId) : prompts;

  const NoPromptsInCategory = filteredPrompts.length === 0 && (searchTerm || selectedCategoryId);

  // if (allPromptsCount === 0 || NoPromptsInCategory) {
  //   return <EmptyMessage message={NoPromptsInCategory ? `${t('noMatchingPrompts')}. ${t('tryOtherTermsOrCategories')}` : t('clickAddPrompt')} />;
  // }

  // Get the currently dragged prompt word
  const activePrompt = activeId ? filteredPrompts.find((prompt) => prompt.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredPrompts.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPrompts.map((prompt) => {
            const category = categoriesMap[prompt.categoryId];

            return (
              <SortablePromptCard
                key={prompt.id}
                prompt={prompt}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleEnabled={onToggleEnabled}
                onTogglePinned={onTogglePinned}
                onCopy={handleCopy}
                copiedId={copiedId}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Drag overlay */}
      <DragOverlay>
        {activePrompt ? (
          <div className="transform rotate-3 scale-105">
            <SortablePromptCard
              prompt={activePrompt}
              category={categoriesMap[activePrompt.categoryId]}
              onEdit={() => {}}
              onDelete={() => {}}
              onToggleEnabled={() => {}}
              onTogglePinned={() => {}}
              onCopy={() => {}}
              copiedId={null}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default PromptList;
