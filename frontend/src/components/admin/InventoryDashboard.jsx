import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, Modal, Row, Col, Alert, Card } from 'react-bootstrap';
import { FaPlus, FaEdit, FaArrowDown, FaArrowUp, FaHistory, FaSearch } from 'react-icons/fa';
import inventoryService from '../../services/inventoryService';

const InventoryDashboard = () => {
  // State for inventory items and loading status
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch inventory items on component mount
  useEffect(() => {
    const fetchInventoryItems = async () => {
      setLoading(true);
      try {
        const data = await inventoryService.getAllInventoryItems();
        setInventoryItems(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching inventory items:", err);
        setError("Failed to fetch inventory items. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInventoryItems();
  }, []);
  
  // Render loading state
  if (loading && inventoryItems.length === 0) {
    return <div className="text-center p-5">Loading inventory data...</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="mb-4">Inventory Management</h2>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Body>
          <div className="text-center">
            Basic inventory view is loaded. Full functionality will be added shortly.
          </div>
        </Card.Body>
      </Card>
      
      <Table striped bordered hover responsive>
        <thead className="bg-light">
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventoryItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center">No inventory items found.</td>
            </tr>
          ) : (
            inventoryItems.map(item => (
              <tr key={item._id}>
                <td>{item.itemCode}</td>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>
                  <Button size="sm" variant="outline-primary">
                    <FaEdit /> Edit
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default InventoryDashboard; 