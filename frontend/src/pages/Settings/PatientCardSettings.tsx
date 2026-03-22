import React, { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useCardTypes, CardType } from '../../context/CardTypeContextNew';
import cardTypeService from '../../services/cardTypeService';
import { toast } from 'react-hot-toast';

const CARD_TYPE_OPTIONS = [
  { value: 'Basic', label: 'Basic' },
  { value: 'Premium', label: 'Premium' },
  { value: 'VIP', label: 'VIP' },
  { value: 'Family', label: 'Family' },
  { value: 'custom', label: 'Custom (Manual Entry)' },
];

const PatientCardSettings: React.FC = () => {
  const { cardTypes, setCardTypes, isLoading, refreshCardTypes } = useCardTypes();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCardType, setEditCardType] = useState<CardType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', validityMonths: 12, price: 0, description: '' });
  const [isCustomInput, setIsCustomInput] = useState(false);

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, name: e.target.value });
  };

  const openAddModal = () => {
    setEditCardType(null);
    setForm({ name: '', validityMonths: 12, price: 0, description: '' });
    setIsCustomInput(false);
    setModalOpen(true);
  };
  const openEditModal = (card: CardType) => {
    console.log("Opening edit modal for card:", card);
    setEditCardType(card);
    setForm({ 
      name: card.name, 
      validityMonths: card.validityMonths, 
      price: card.price,
      description: card.description || ''
    });
    setModalOpen(true);
  };
  const handleModalClose = () => {
    setModalOpen(false);
    setEditCardType(null);
    setIsCustomInput(false);
  };
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'name' && value === 'custom') {
      setIsCustomInput(true);
      setForm({ ...form, name: '' }); // Clear the name when switching to custom
    } else if (name === 'name' && value !== 'custom' && !isCustomInput) {
      setIsCustomInput(false);
      setForm({ ...form, [name]: value });
    } else {
      setForm({ ...form, [name]: type === 'number' ? Number(value) : value });
    }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.name.trim() === '') {
      toast.error('Please enter a card type name.');
      return;
    }
    
    // Validate custom name format
    if (isCustomInput && form.name.trim().length < 2) {
      toast.error('Card type name must be at least 2 characters long.');
      return;
    }
    try {
      console.log("Submitting card type:", { ...form, value: form.name || "", isActive: true });

      if (editCardType) {
        // Make sure we include the _id field when updating
        const updatedCard = {
          _id: editCardType._id, // Ensure _id is passed correctly
          name: form.name,
          value: editCardType.value || form.name.toLowerCase(), // Keep the original value or derive from name
          price: form.price,
          validityMonths: form.validityMonths,
          description: form.description || `${form.name} patient membership with ${form.name.toLowerCase()} benefits.`,
          isActive: true
        };

        console.log("Updating card type with data:", updatedCard);
        
        try {
          const response = await cardTypeService.updateCardType(updatedCard);
          console.log("Update response:", response);
          
          // Check if response contains data property (new format) or is the data itself (old format)
          const updatedCardData = response.data || response;
          
          // Refresh the card types from the API to ensure we have the latest data
          await refreshCardTypes();
          
          toast.success('Card type updated successfully!');
          
          // Reset form and close modal
          setForm({ name: '', price: 0, validityMonths: 12, description: '' });
          setEditCardType(null);
          setModalOpen(false);
        } catch (updateError: any) {
          console.error("Error updating card type:", updateError);
          toast.error(updateError.response?.data?.message || 'Failed to update card type. Please check the server connection.');
        }
      } else {
        // Check if card type already exists before creating
        const existingCard = cardTypes.find(card => 
          card.name.toLowerCase() === form.name.toLowerCase()
        );
        
        if (existingCard) {
          toast.error(`Card type "${form.name}" already exists! Please edit the existing one or choose a different name.`);
          return;
        }

        // Creating a new card type
        const newCard = {
          name: form.name,
          value: form.name.toLowerCase(),
          price: form.price,
          validityMonths: form.validityMonths,
          description: form.description || `${form.name} patient membership with ${form.name.toLowerCase()} benefits.`,
          isActive: true
        };

        try {
          const response = await cardTypeService.createCardType(newCard);
          console.log("Create response:", response);
          
          // Refresh the card types from the API to ensure we have the latest data
          await refreshCardTypes();
          
          toast.success('Card type created successfully!');
          
          // Reset form and close modal
          setForm({ name: '', price: 0, validityMonths: 12, description: '' });
          setEditCardType(null);
          setModalOpen(false);
        } catch (createError: any) {
          console.error("Error creating card type:", createError);
          toast.error(createError.message || createError.response?.data?.message || 'Failed to create card type. Please check the server connection.');
        }
      }
    } catch (error: any) {
      console.error("Error saving card type:", error);
      toast.error(error.message || error.response?.data?.message || 'Failed to save card type. Please check the server connection.');
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await cardTypeService.deleteCardType(id);
      toast.success('Card type deleted successfully!');
      setDeleteId(null);
      
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete card type');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Patient Card Settings</h1>
      <p className="text-muted-foreground mb-4">Manage patient card types, renewal periods, and related settings here.</p>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading card types...</span>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Card Types</h2>
            <div className="flex items-center space-x-2">
              <Button onClick={openAddModal}>
                Add New Card Type
              </Button>
            </div>
          </div>
          <table className="w-full text-left border-t">
            <thead>
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Validity (months)</th>
                <th className="py-2">Price</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cardTypes.map(card => (
                <tr key={card._id} className="border-b">
                  <td className="py-2">{card.name}</td>
                  <td className="py-2">{card.validityMonths}</td>
                  <td className="py-2">ETB {card.price}</td>
                  <td className="py-2 space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(card)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteId(card._id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {/* Modal for Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-primary-foreground rounded-lg shadow-lg p-8 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editCardType ? 'Edit Card Type' : 'Add Card Type'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                {editCardType ? (
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    className="w-full border rounded px-2 py-1"
                    disabled
                  />
                ) : (
                  <>
                    {!isCustomInput ? (
                      <select
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        required
                        className="w-full border rounded px-2 py-1"
                      >
                        <option value="">Select card type</option>
                        {CARD_TYPE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleCustomNameChange}
                        placeholder="Enter custom card type name"
                        required
                        className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                    )}
                    {isCustomInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomInput(false);
                          setForm({ ...form, name: '' });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 mt-1"
                      >
                        ← Back to predefined options
                      </button>
                    )}
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Validity (months)</label>
                <input name="validityMonths" type="number" min={1} value={form.validityMonths} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input name="price" type="number" min={0} value={form.price} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Card type description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button type="button" variant="outline" onClick={handleModalClose}>Cancel</Button>
                <Button type="submit" disabled={!form.name}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-primary-foreground rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Delete Card Type?</h3>
            <p>Are you sure you want to delete this card type?</p>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteId)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Renewal Settings</h2>
        <p className="text-muted-foreground">Configure renewal periods, grace periods, and fees here. (Coming soon)</p>
      </Card>
    </div>
  );
};

export default PatientCardSettings; 