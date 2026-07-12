import React, { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useCardTypes, CardType } from '../../context/CardTypeContextNew';
import cardTypeService from '../../services/cardTypeService';
import { toast } from 'react-hot-toast';
import { Check } from 'lucide-react';

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
  const [form, setForm] = useState({
    name: '',
    validityMonths: 12,
    price: 0,
    description: '',
    serviceDiscount: 0,
    labDiscount: 0,
    consultationDiscount: 0,
    freeConsultations: 0,
    freeLabTests: 0,
    priorityAppointments: false,
    groupDiscount: 0
  });
  const [isCustomInput, setIsCustomInput] = useState(false);

  const handleCustomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, name: e.target.value });
  };

  const openAddModal = () => {
    setEditCardType(null);
    setForm({
      name: '',
      validityMonths: 12,
      price: 0,
      description: '',
      serviceDiscount: 0,
      labDiscount: 0,
      consultationDiscount: 0,
      freeConsultations: 0,
      freeLabTests: 0,
      priorityAppointments: false,
      groupDiscount: 0
    });
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
      description: card.description || '',
      serviceDiscount: card.discounts?.service || 0,
      labDiscount: card.discounts?.lab || 0,
      consultationDiscount: card.discounts?.consultation || 0,
      freeConsultations: card.freeConsultations || 0,
      freeLabTests: card.freeLabTests || 0,
      priorityAppointments: card.priorityAppointments || false,
      groupDiscount: card.groupDiscount || 0
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
      const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value);
      setForm({ ...form, [name]: val });
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
          discounts: {
            service: form.serviceDiscount,
            lab: form.labDiscount,
            consultation: form.consultationDiscount
          },
          freeConsultations: form.freeConsultations,
          freeLabTests: form.freeLabTests,
          priorityAppointments: form.priorityAppointments,
          groupDiscount: form.groupDiscount,
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
          setForm({
            name: '',
            price: 0,
            validityMonths: 12,
            description: '',
            serviceDiscount: 0,
            labDiscount: 0,
            consultationDiscount: 0,
            freeConsultations: 0,
            freeLabTests: 0,
            priorityAppointments: false,
            groupDiscount: 0
          });
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
          discounts: {
            service: form.serviceDiscount,
            lab: form.labDiscount,
            consultation: form.consultationDiscount
          },
          freeConsultations: form.freeConsultations,
          freeLabTests: form.freeLabTests,
          priorityAppointments: form.priorityAppointments,
          groupDiscount: form.groupDiscount,
          isActive: true
        };

        try {
          const response = await cardTypeService.createCardType(newCard);
          console.log("Create response:", response);
          
          // Refresh the card types from the API to ensure we have the latest data
          await refreshCardTypes();
          
          toast.success('Card type created successfully!');
          
          // Reset form and close modal
          setForm({
            name: '',
            price: 0,
            validityMonths: 12,
            description: '',
            serviceDiscount: 0,
            labDiscount: 0,
            consultationDiscount: 0,
            freeConsultations: 0,
            freeLabTests: 0,
            priorityAppointments: false,
            groupDiscount: 0
          });
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
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Card Types & Tiers</h2>
            <Button onClick={openAddModal} className="bg-teal-600 hover:bg-teal-700 text-white">
              Add New Card Type
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cardTypes.map(card => (
              <div 
                key={card._id} 
                className="border-2 border-slate-100 rounded-2xl p-6 bg-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-sm"
              >
                {/* Accent band at the top */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{card.name} Tier</h3>
                    <div className="text-right">
                      <span className="text-2xl font-black text-teal-600">{card.price}</span>
                      <span className="text-xs text-slate-400 block">ETB</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-6 italic h-12 overflow-hidden line-clamp-2">
                    {card.description || `Configured ${card.name.toLowerCase()} package tier.`}
                  </p>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                      <span>{card.discounts?.service || 0}% Service Discount</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                      <span>{card.discounts?.lab || 0}% Lab Discount</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                      <span>{card.discounts?.consultation || 0}% Consultation Discount</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                      <span>{card.freeConsultations === 999 ? 'Unlimited' : `${card.freeConsultations || 0}`} Free Consultations</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-700">
                      <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                      <span>{card.freeLabTests || 0} Free Lab Tests</span>
                    </div>
                    {card.priorityAppointments && (
                      <div className="flex items-center text-sm text-slate-700">
                        <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                        <span>Priority Appointments</span>
                      </div>
                    )}
                    {card.groupDiscount > 0 && (
                      <div className="flex items-center text-sm text-slate-700">
                        <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                        <span>{card.groupDiscount}% Group Discount</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-4 border-t pt-2 block">
                      Valid for {card.validityMonths} months
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4 border-t border-slate-100 mt-auto">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 hover:bg-teal-50 hover:text-teal-600 border-slate-200"
                    onClick={() => openEditModal(card)}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border-none shadow-none"
                    onClick={() => setDeleteId(card._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (ETB)</label>
                  <input name="price" type="number" min={0} value={form.price} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Validity (months)</label>
                  <input name="validityMonths" type="number" min={1} value={form.validityMonths} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
                </div>
              </div>
              
              <div className="border-t pt-4 my-2">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Discount Rates (%)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Service</label>
                    <input name="serviceDiscount" type="number" min={0} max={100} value={form.serviceDiscount} onChange={handleFormChange} required className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Lab</label>
                    <input name="labDiscount" type="number" min={0} max={100} value={form.labDiscount} onChange={handleFormChange} required className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Consultation</label>
                    <input name="consultationDiscount" type="number" min={0} max={100} value={form.consultationDiscount} onChange={handleFormChange} required className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Free Consultations</label>
                  <input name="freeConsultations" type="number" min={0} value={form.freeConsultations} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Free Lab Tests</label>
                  <input name="freeLabTests" type="number" min={0} value={form.freeLabTests} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 items-center border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Group Discount (%)</label>
                  <input name="groupDiscount" type="number" min={0} max={100} value={form.groupDiscount} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
                </div>
                <div className="flex items-center mt-6">
                  <input 
                    name="priorityAppointments" 
                    type="checkbox" 
                    id="priorityAppointments" 
                    checked={form.priorityAppointments} 
                    onChange={handleFormChange} 
                    className="h-4 w-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500" 
                  />
                  <label htmlFor="priorityAppointments" className="ml-2 text-sm font-medium text-slate-700 cursor-pointer">Priority Appt.</label>
                </div>
              </div>
              
              <div className="border-t pt-4">
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
              <div className="flex justify-end space-x-2 mt-4 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleModalClose}>Cancel</Button>
                <Button type="submit" disabled={!form.name} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button>
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